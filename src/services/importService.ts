import { createContact } from './contactService'

export const parseLinkedInCSV = async (file: File): Promise<{ success: number; failed: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = async (e) => {
            const text = e.target?.result as string
            if (!text) {
                reject(new Error("Empty file"))
                return
            }

            // Simple CSV parser handling standard LinkedIn Export format
            // Expected headers roughly: First Name, Last Name, URL, Email Address, Company, Position, Connected On

            const lines = text.split('\n')
            if (lines.length < 2) {
                resolve({ success: 0, failed: 0 })
                return
            }

            // Basic parsing assuming standard quotes and comma separation
            // We'll skip the header row
            const dataRows = lines.slice(1).filter(line => line.trim().length > 0)

            let success = 0
            let failed = 0

            for (const row of dataRows) {
                try {
                    // Very naive CSV split, mostly works for LinkedIn unless commas in fields
                    // For a robust solution we'd use a regex or library, but for MVP/Agent:
                    // LinkedIn export usually quotes fields with commas.

                    // Regex to split by comma, ignoring commas inside quotes
                    const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
                    const cols = matches.map(m => m.replace(/^"|"$/g, '').trim()) // remove quotes

                    // LinkedIn Export Columns (approximate indices)
                    // 0: First Name, 1: Last Name, 2: URL, 3: Email, 4: Company, 5: Position, 6: Connected On

                    if (cols.length < 2) continue // Skip empty/malformed

                    const firstName = cols[0] || ''
                    const lastName = cols[1] || ''
                    const company = cols[4] || ''
                    const position = cols[5] || ''
                    const email = cols[3] || ''

                    const name = `${firstName} ${lastName}`.trim()

                    if (!name) {
                        failed++
                        continue
                    }

                    await createContact({
                        name,
                        email,
                        job: `${position} at ${company}`.trim(),
                        howMet: 'LinkedIn Import',
                        relationshipStrength: 'weak', // Default for bulk import
                        tags: ['LinkedIn']
                    })

                    success++
                } catch (err) {
                    console.error("Failed to import row:", row, err)
                    failed++
                }
            }

            resolve({ success, failed })
        }

        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsText(file)
    })
}
