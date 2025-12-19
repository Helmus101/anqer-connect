import React, { useState } from 'react'
import type { Contact } from '../../types'

interface AddContactModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (contact: Partial<Contact>) => void
}

export default function AddContactModal({ isOpen, onClose, onSave }: AddContactModalProps) {
    const [formData, setFormData] = useState<Partial<Contact>>({
        name: '',
        phone: '',
        email: '',
        howMet: '',
        relationshipStrength: 'medium',
        avatar: ''
    })

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name) return
        onSave(formData)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-gray-100">
                <h2 className="text-xl font-bold text-black mb-6 tracking-tight">Add New Contact</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Alex Smith"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+1 234..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="alex@..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">How you met</label>
                        <input
                            type="text"
                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                            value={formData.howMet || ''}
                            onChange={e => setFormData({ ...formData, howMet: e.target.value })}
                            placeholder="e.g. at a party, university..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Strength</label>
                        <select
                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black appearance-none transition-all"
                            value={formData.relationshipStrength}
                            onChange={e => setFormData({ ...formData, relationshipStrength: e.target.value as any })}
                        >
                            <option value="close">Very Close</option>
                            <option value="medium">Medium</option>
                            <option value="weak">Weak</option>
                            <option value="drifting">Drifting</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-black font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-black text-white font-bold rounded-md hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            Save Contact
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
