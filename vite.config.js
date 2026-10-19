import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes('/node_modules/@firebase/firestore/'))
                        return 'firebase-firestore';
                    if (id.includes('/node_modules/@firebase/auth/'))
                        return 'firebase-auth';
                    if (id.includes('/node_modules/firebase/'))
                        return 'firebase-sdk';
                    if (id.includes('/node_modules/@firebase/'))
                        return 'firebase-core';
                },
            },
        },
    },
});
