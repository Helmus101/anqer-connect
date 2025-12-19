export const messageService = {
    syncMessages: async () => {
        // Simulating sync
        return true;
    },

    getMessages: async () => {
        return [
            { id: '1', sender: '+15550192', content: 'Your code is 1234', timestamp: new Date().toISOString() }
        ];
    }
};
