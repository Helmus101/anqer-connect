export const whatsappService = {
    authorize: async () => {
        // Simulating QR code scan wait
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
    },

    uploadContacts: async (contacts: any[]) => {
        console.log('Uploading contacts to WhatsApp...', contacts.length);
        return true;
    },

    getRecentMessages: async () => {
        return [
            { id: '1', sender: 'Hiking Group', content: 'Are we still on for Sat?', timestamp: new Date().toISOString() },
            { id: '2', sender: 'Alex', content: 'Sent the file!', timestamp: new Date().toISOString() }
        ];
    }
};
