import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import ImportLinkedIn from '../../components/settings/ImportLinkedIn'
import ImportWhatsApp from '../../components/settings/ImportWhatsApp'
import {
    RefreshCw, Upload, Calendar, Mail, FileSpreadsheet, Users, UserPlus, UserCheck
} from 'lucide-react'
import { parseLinkedInCSV } from '../../services/importService'
import { getContacts } from '../../services/contactService'
import { sendFriendRequest, getFriendRequests, acceptFriendRequest, getFriends } from '../../services/friendService'
import { googleService } from '../../services/googleService'



export default function Settings() {
    const { signInWithGoogle } = useAuth()
    const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null)
    const [batchLog, setBatchLog] = useState<string[]>([])

    // Google Sync
    const [syncing, setSyncing] = useState(false)
    const [lastSync, setLastSync] = useState<string | null>(null)

    // Batch Deep Analysis Handler
    const handleBatchEnrich = async () => {
        const allContacts = await getContacts()
        if (!allContacts || allContacts.length === 0) {
            alert("No contacts found to enrich.")
            return
        }

        if (!confirm("Start Deep Analysis Batch? This will performing Google Searches and AI analysis for ALL contacts. This may take a long time.")) return

        setBatchProgress({ current: 0, total: allContacts.length })
        setBatchLog([])

        // Process sequentially to be gentle on Rate Limits (Google Search limits)
        let processed = 0

        for (const contact of allContacts) {
            try {
                setBatchLog(prev => [`Analyzing ${contact.name}...`, ...prev.slice(0, 8)])

                // Call deep-analyze function
                const response = await fetch('/.netlify/functions/deep-analyze', {
                    method: 'POST',
                    body: JSON.stringify({
                        contactId: contact.id,
                        name: contact.name,
                        location: contact.location,
                        job: contact.job,
                        email: contact.email,
                        interactions: contact.interactions || []
                    })
                })

                const data = await response.json()

                if (data.success) {
                    // Update contact
                    const { updateContact } = await import('../../services/contactService')
                    await updateContact(contact.id, {
                        interests: data.interests || [],
                        relationshipSummary: data.relationshipSummary || contact.relationshipSummary
                    })

                    setBatchLog(prev => [`✓ ${contact.name}: Found ${data.interests?.length || 0} interests`, ...prev.slice(0, 8)])
                } else {
                    setBatchLog(prev => [`❌ Failed: ${contact.name}`, ...prev.slice(0, 8)])
                }

            } catch (err: any) {
                console.error(err)
                setBatchLog(prev => [`❌ Failed: ${contact.name} (${err.message})`, ...prev.slice(0, 8)])
            } finally {
                processed++
                setBatchProgress({ current: processed, total: allContacts.length })
                // Wait 1 second between contacts to avoid rate limits
                await new Promise(r => setTimeout(r, 1500))
            }
        }

        setBatchLog(prev => [`Full Batch Analysis Complete! Processed ${processed} contacts.`, ...prev])
        setTimeout(() => setBatchProgress(null), 5000)
    }



    const handleGoogleSync = async () => {
        setSyncing(true)
        try {
            await googleService.syncData()
            setLastSync(new Date().toLocaleTimeString())
            alert("Google Sync Completed! Contacts and Interactions updated.")
        } catch (error: any) {
            console.error(error)
            const isAuthError = error.message === "Unauthorized" || error.message?.includes("No Google token")

            if (isAuthError) {
                signInWithGoogle()
            } else {
                alert("Sync failed. " + error.message)
            }
        } finally {
            setSyncing(false)
        }
    }

    // LinkedIn Import
    const [importing, setImporting] = useState(false)
    const handleLinkedInImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImporting(true)
        try {
            const { success, failed } = await parseLinkedInCSV(file)
            alert(`Import complete!\nSuccess: ${success}\nFailed: ${failed}`)
        } catch (error) {
            console.error(error)
            alert("Import failed. Please check the file format.")
        } finally {
            setImporting(false)
            e.target.value = ''
        }
    }


    // Friend Network Logic
    const [friendEmail, setFriendEmail] = useState('')
    const [friends, setFriends] = useState<any[]>([])
    const [friendRequests, setFriendRequests] = useState<any[]>([])

    useEffect(() => {
        loadNetworkData()
    }, [])

    const loadNetworkData = async () => {
        try {
            const [myFriends, myRequests] = await Promise.all([
                getFriends(),
                getFriendRequests()
            ])
            setFriends(myFriends || [])
            setFriendRequests(myRequests || [])
        } catch (error) {
            console.error("Failed to load network", error)
        }
    }

    const handleAddFriend = async () => {
        if (!friendEmail) return
        try {
            const res = await sendFriendRequest(friendEmail)
            if (res.success) {
                alert("Friend request sent!")
                setFriendEmail('')
            } else {
                alert(res.message)
            }
        } catch (error) {
            console.error(error)
            alert("Failed to send request")
        }
    }

    const handleAcceptRequest = async (id: string) => {
        try {
            await acceptFriendRequest(id)
            alert("Friend request accepted!")
            loadNetworkData()
        } catch (error) {
            console.error(error)
            alert("Failed to accept request")
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto bg-white min-h-screen animate-in fade-in duration-500">
            <h1 className="text-3xl font-extrabold text-black mb-8 tracking-tighter">Settings</h1>

            {/* Network Section */}
            <section className="mb-12">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Network & Friends</h2>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                        <Users size={20} /> Manage Network
                    </h3>

                    {/* Add Friend */}
                    <div className="flex gap-2 mb-6">
                        <input
                            type="email"
                            value={friendEmail}
                            onChange={(e) => setFriendEmail(e.target.value)}
                            placeholder="Enter friend's email..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-black transition-colors"
                        />
                        <button
                            onClick={handleAddFriend}
                            className="bg-black text-white font-bold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                            <UserPlus size={16} /> Add
                        </button>
                    </div>

                    {/* Pending Requests */}
                    {friendRequests.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Pending Requests</h4>
                            <div className="space-y-2">
                                {friendRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                        <div className="text-sm">
                                            <span className="font-bold text-yellow-900">{req.sender?.email}</span> wants to connect.
                                        </div>
                                        <button
                                            onClick={() => handleAcceptRequest(req.id)}
                                            className="bg-yellow-500 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-yellow-600 transition-colors flex items-center gap-1"
                                        >
                                            <UserCheck size={12} /> Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friends List */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Your Friends ({friends.length})</h4>
                        {friends.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {friends.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                                            {f.friend?.email?.[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 truncate">{f.friend?.email}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No friends added yet.</p>
                        )}
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Integrations</h2>

                <div className="space-y-4">
                    {/* Batch Actions */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-indigo-600" />
                            Batch Operations
                        </h2>

                        <div className="space-y-4">
                            <button
                                onClick={handleBatchEnrich}
                                disabled={!!batchProgress}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-medium transition-colors ${batchProgress ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <RefreshCw className={`w-4 h-4 ${batchProgress ? 'animate-spin' : ''}`} />
                                {batchProgress ? `Analyzing (${batchProgress.current}/${batchProgress.total})...` : 'Analyze All Interactions'}
                            </button>

                            {batchLog.length > 0 && (
                                <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono space-y-1 h-24 overflow-y-auto">
                                    {batchLog.map((l, i) => <div key={i}>{l}</div>)}
                                </div>
                            )}

                            <p className="text-xs text-gray-500 mt-2">
                                ⚠️ Analyzes conversation history to extract interests.
                            </p>
                        </div>
                    </div>

                    {/* Data Management Section */}
                    <div className="w-full max-w-2xl mx-auto mb-10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Data Management</h2>
                        <div className="space-y-4">
                            <ImportLinkedIn />
                            <ImportWhatsApp />
                        </div>
                    </div>

                    {/* Google Integration */}
                    <div className="flex items-center justify-between p-6 border border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg text-black">
                                <div className="flex gap-1">
                                    <Calendar size={20} />
                                    <Mail size={20} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-black">Google Workspace</h3>
                                <p className="text-xs text-gray-500 mt-1">Sync Calendar events, Gmails, and Contacts</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {lastSync && <span className="text-[10px] text-gray-400 font-medium">Last synced: {lastSync}</span>}
                            <button
                                onClick={handleGoogleSync}
                                disabled={syncing}
                                className="px-4 py-2 rounded-md text-xs font-bold border border-black bg-black text-white hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </div>
                    </div>

                    {/* LinkedIn Import */}
                    <div className="flex items-center justify-between p-6 border border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg text-black">
                                <div className="flex gap-1">
                                    <FileSpreadsheet size={20} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-black">LinkedIn Import</h3>
                                <p className="text-xs text-gray-500 mt-1">Upload CSV export to bulk add connections</p>
                            </div>
                        </div>
                        <div>
                            <input
                                type="file"
                                id="linkedin-upload"
                                accept=".csv"
                                className="hidden"
                                onChange={handleLinkedInImport}
                            />
                            <label
                                htmlFor="linkedin-upload"
                                className={`px-4 py-2 rounded-md text-xs font-bold border border-black bg-black text-white hover:bg-gray-800 transition-all flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Upload size={12} className={importing ? "animate-spin" : ""} />
                                {importing ? 'Importing...' : 'Upload CSV'}
                            </label>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )

}
