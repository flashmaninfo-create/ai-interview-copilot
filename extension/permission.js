document.getElementById('grantBtn').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Stop tracks immediately, we just needed the permission grant for the origin
        stream.getTracks().forEach(track => track.stop());

        // Update UI
        document.getElementById('requestStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';

        // Notify background (optional, but good for sync)
        console.log('Microphone permission granted.');

        // Auto close after a moment
        setTimeout(() => {
            window.close();
        }, 1500);
    } catch (err) {
        console.error('Permission denied:', err);
        alert('Permission denied. Please allow microphone access in your browser settings for this extension.');
    }
});
