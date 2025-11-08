// Menjalankan kode hanya setelah seluruh halaman HTML dimuat
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Referensi ke Elemen-elemen HTML (Tidak Berubah) ---
    const video = document.getElementById('webcam');
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const statusEmotion = document.getElementById('statusEmotion');
    const statusFatigue = document.getElementById('statusFatigue');
    const loader = document.getElementById('loader');
    const statusResult = document.getElementById('statusResult');

    // Variabel (Tidak Berubah)
    let stream = null;
    let analysisInterval = null;
    const ANALYSIS_DELAY = 5000;

    // --- 2. Inisialisasi Grafik (Chart.js) (Tidak Berubah) ---
    const ctx = document.getElementById('healthChart').getContext('2d');
    const healthChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: [],
            datasets: [{
                label: 'Skor Kelelahan (1=Lelah, 0=Bangun)',
                data: [], 
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                yAxisID: 'yFatigue', 
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Waktu' } },
                yFatigue: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Skor Kelelahan' },
                    min: -1, // Skala grafik kita sudah benar (0-1)
                    max: 1 
                }
            }
        }
    });

    // --- 3. Fungsi Load Histori (Tidak Berubah) ---
    async function loadInitialChartData() {
        try {
            const response = await fetch('/api/logs');
            if (!response.ok) return;
            const data = await response.json();
            if (data.success && data.logs) {
                const labels = [];
                const fatigueData = [];
                data.logs.forEach(log => {
                    const ts = new Date(log.timestamp);
                    const label = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}`;
                    if(log.fatigue_score > -1.0) {
                        labels.push(label);
                        fatigueData.push(log.fatigue_score); // Mendorong skor float
                    }
                });
                const MAX_POINTS = 50;
                healthChart.data.labels = labels.slice(-MAX_POINTS);
                healthChart.data.datasets[0].data = fatigueData.slice(-MAX_POINTS);
                healthChart.update();
            }
        } catch (error) {
            console.error("Error memuat data grafik:", error);
        }
    }

    // --- 4. Logika Tombol Start/Stop (Tidak Berubah) ---
    btnStart.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = stream;
            video.play();
            btnStart.disabled = true;
            btnStop.disabled = false;
            statusEmotion.textContent = 'Memulai...';
            statusFatigue.textContent = 'Memulai...';
            sendFrame(); 
            analysisInterval = setInterval(sendFrame, ANALYSIS_DELAY);
        } catch (error) {
            console.error('Error saat mengakses webcam:', error);
            alert('Tidak dapat mengakses webcam. Pastikan Anda memberikan izin.');
        }
    });

    btnStop.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }
        btnStart.disabled = false;
        btnStop.disabled = true;
        video.srcObject = null;
        statusEmotion.textContent = 'Menunggu';
        statusFatigue.textContent = 'Menunggu';
        hideLoading();
    });

    // --- 5. Fungsi 'sendFrame' (Tidak Berubah) ---
    async function sendFrame() {
        if (!stream || video.readyState < video.HAVE_CURRENT_DATA) return;
        showLoading();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataBase64 = canvas.toDataURL('image/jpeg');
        try {
            const response = await fetch('/api/analyze_frame', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ image_data: imageDataBase64 })
            });
            hideLoading();
            if (!response.ok) {
                console.error('API Error:', response.status, await response.text());
                updateStatusUI('error', 'error');
                return;
            }
            const result = await response.json();
            updateStatusUI(result.emotion, result.fatigue_score);
            updateChart(result.fatigue_score);
        } catch (error) {
            console.error('Gagal mengirim frame:', error);
            hideLoading();
            updateStatusUI('offline', 'offline');
        }
    }

    // ==========================================================
    // --- 6. MODIFIKASI: FUNGSI 'updateStatusUI' ---
    // ==========================================================
    function updateStatusUI(emotion, fatigue) {
        // A. Update Teks Emosi (Tidak Berubah)
        statusEmotion.textContent = emotion;
        switch(emotion) {
            case 'happy': statusEmotion.className = 'badge bg-success'; break;
            case 'sad': statusEmotion.className = 'badge bg-primary'; break;
            case 'angry': statusEmotion.className = 'badge bg-danger'; break;
            case 'neutral': statusEmotion.className = 'badge bg-info'; break;
            case 'no_face_detected': statusEmotion.className = 'badge bg-warning'; break;
            default: statusEmotion.className = 'badge bg-secondary';
        }

        // --- B. Update Teks Kelelahan (LOGIKA BARU DENGAN THRESHOLD) ---
        let fatigueText = 'N/A';
        let fatigueClass = 'badge bg-secondary';
        
        // Tentukan ambang batas. (Model kita 0=awake, 1=sleepy)
        // Jadi, jika skor > 0.5, kita anggap lelah.
        const FATIGUE_THRESHOLD = 0.5; 

        if (fatigue > -1.0) { // Jika ada deteksi (skor bukan -1.0)
            if (fatigue < FATIGUE_THRESHOLD) {
                // Skor di bawah 0.5 -> Bangun
                fatigueText = `Bangun (Skor: ${fatigue.toFixed(2)})`;
                fatigueClass = 'badge bg-success';
            } else {
                // Skor di atas 0.5 -> Lelah
                fatigueText = `Lelah (Skor: ${fatigue.toFixed(2)})`;
                fatigueClass = 'badge bg-danger';
            }
        } else if (fatigue === -1.0) { // no_face_detected
            fatigueText = 'Tidak Ada Wajah';
            fatigueClass = 'badge bg-warning';
        }

        statusFatigue.textContent = fatigueText;
        statusFatigue.className = fatigueClass;
    }
    // ----------------------------------------------------------

    // --- 7. Fungsi Helper Lainnya (Tidak Berubah) ---
    
    // Fungsi ini SUDAH BENAR, karena 'fatigueScore'
    // adalah variabel, jadi dia akan mendorong skor float (cth: 0.87)
    function updateChart(fatigueScore) {
        if (fatigueScore === -1.0) return;
        const now = new Date();
        const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        healthChart.data.labels.push(label);
        healthChart.data.datasets[0].data.push(fatigueScore); 
        const MAX_DATA_POINTS = 10;
        if (healthChart.data.labels.length > MAX_DATA_POINTS) {
            healthChart.data.labels.shift();
            healthChart.data.datasets[0].data.shift();
        }
        healthChart.update();
    }

    function showLoading() {
        loader.style.display = 'block';
        statusResult.style.display = 'none';
    }

    function hideLoading() {
        loader.style.display = 'none';
        statusResult.style.display = 'block';
    }

    // --- 8. Panggil Load Histori (Tidak Berubah) ---
    loadInitialChartData();
});