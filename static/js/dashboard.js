document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Referensi ke Elemen-elemen HTML (Diperbarui) ---
    const video = document.getElementById('webcam');
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    
    const statusEmotion = document.getElementById('statusEmotion');
    const statusFatigue = document.getElementById('statusFatigue');
    const loader = document.getElementById('loader');

    // Variabel stream & interval
    let stream = null;
    let analysisInterval = null;
    const ANALYSIS_DELAY = 5000; // 5 detik

    // --- 2. Inisialisasi Grafik (DIUBAH UNTUK 2 GRAFIK) ---
    const fatigueCtx = document.getElementById('fatigueChart').getContext('2d');
    const emotionCtx = document.getElementById('emotionChart').getContext('2d');

    // Grafik Garis untuk Kelelahan
    const fatigueLineChart = new Chart(fatigueCtx, {
        type: 'line',
        data: {
            labels: [], // Sumbu X (waktu)
            datasets: [{
                label: 'Skor Kelelahan (1=Lelah, 0=Bangun)',
                data: [], // Sumbu Y
                borderColor: 'var(--solution-blue)',
                backgroundColor: 'rgba(0, 119, 182, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: -0.1, max: 1.1 },
                x: { title: { display: true, text: 'Waktu' } }
            }
        }
    });

    // Grafik Bar untuk Emosi
    const emotionBarChart = new Chart(emotionCtx, {
        type: 'bar',
        data: {
            labels: ['Happy', 'Sad', 'Angry', 'Neutral', 'Fear', 'Surprise'],
            datasets: [{
                label: 'Jumlah Deteksi Emosi',
                data: [0, 0, 0, 0, 0, 0], // Data awal
                backgroundColor: [
                    'rgba(56, 176, 0, 0.7)',  // solution-green (Happy)
                    'rgba(0, 119, 182, 0.7)', // solution-blue (Sad)
                    'rgba(214, 40, 40, 0.7)', // problem-red (Angry)
                    'rgba(108, 117, 125, 0.7)', // gray (Neutral)
                    'rgba(150, 0, 200, 0.7)', // purple (Fear)
                    'rgba(255, 193, 7, 0.7)'   // yellow (Surprise)
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Membuat bar menjadi horizontal
            scales: {
                x: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // --- 3. Memuat Data Histori (DIUBAH UNTUK 2 GRAFIK) ---
    async function loadInitialChartData() {
        try {
            const response = await fetch('/api/logs');
            if (!response.ok) return;
            const data = await response.json();
            
            if (data.success && data.logs) {
                const labels = [];
                const fatigueData = [];
                const emotionCounts = { 'happy': 0, 'sad': 0, 'angry': 0, 'neutral': 0, 'fear': 0, 'surprise': 0 };

                data.logs.forEach(log => {
                    // Data untuk Grafik Kelelahan (Line)
                    if(log.fatigue_score > -1.0) {
                        const ts = new Date(log.timestamp);
                        const label = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}`;
                        labels.push(label);
                        fatigueData.push(log.fatigue_score);
                    }
                    // Data untuk Grafik Emosi (Bar)
                    if (emotionCounts.hasOwnProperty(log.emotion)) {
                        emotionCounts[log.emotion]++;
                    }
                });

                // Update Grafik Kelelahan
                const MAX_POINTS = 50;
                fatigueLineChart.data.labels = labels.slice(-MAX_POINTS);
                fatigueLineChart.data.datasets[0].data = fatigueData.slice(-MAX_POINTS);
                fatigueLineChart.update();

                // Update Grafik Emosi
                emotionBarChart.data.datasets[0].data = [
                    emotionCounts.happy,
                    emotionCounts.sad,
                    emotionCounts.angry,
                    emotionCounts.neutral,
                    emotionCounts.fear,
                    emotionCounts.surprise
                ];
                emotionBarChart.update();
            }
        } catch (error) {
            console.error("Error memuat data grafik:", error);
        }
    }

    // --- 4. Logika Tombol (Sama, tapi dengan error handling lebih baik) ---
    btnStart.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
                audio: false 
            });
            
            video.srcObject = stream;
            await video.play();

            btnStart.disabled = true;
            btnStop.disabled = false;
            statusEmotion.textContent = 'Memulai...';
            statusFatigue.textContent = 'Memulai...';

            sendFrame(); 
            analysisInterval = setInterval(sendFrame, ANALYSIS_DELAY);
        } catch (error) {
            console.error('Error saat mengakses webcam:', error);
             let errorMsg = 'Tidak dapat mengakses kamera. ';
             if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                 errorMsg += 'Mohon izinkan akses kamera di browser Anda.';
             } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                 errorMsg += 'Kamera tidak ditemukan.';
             } else {
                 errorMsg += error.message;
             }
            alert(errorMsg);
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
        statusEmotion.textContent = 'Menunggu...';
        statusFatigue.textContent = 'Menunggu...';
        showLoading(false);
    });

    // --- 5. Fungsi Kirim Frame (DIUBAH UNTUK 2 GRAFIK) ---
    async function sendFrame() {
        if (!stream || video.readyState < video.HAVE_CURRENT_DATA) return;
        showLoading(true);

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: imageDataBase64 })
            });
            showLoading(false);

            if (!response.ok) {
                updateStatusUI('Error', -1);
                return;
            }

            const result = await response.json();
            
            // Update UI & Grafik
            updateStatusUI(result.emotion, result.fatigue_score);
            updateFatigueChart(result.fatigue_score);
            updateEmotionChart(result.emotion); // Panggil fungsi update emosi

        } catch (error) {
            console.error('Gagal mengirim frame:', error);
            showLoading(false);
            updateStatusUI('Offline', -1);
        }
    }

    // --- 6. Fungsi Helper (DIUBAH) ---

    // Update teks status
    function updateStatusUI(emotion, fatigue) {
        // Update Emosi
        statusEmotion.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        
        // Update Kelelahan
        let fatigueText = 'N/A';
        if (fatigue === 0.0) {
            fatigueText = 'Bangun';
        } else if (fatigue === 1.0) {
            fatigueText = 'Lelah';
        } else if (fatigue === -1.0) {
            fatigueText = 'Tidak Ada Wajah';
        } else if (emotion === 'Error' || emotion === 'Offline') {
            fatigueText = 'Error';
        }
        statusFatigue.textContent = fatigueText;
    }

    // Update grafik garis kelelahan
    function updateFatigueChart(fatigueScore) {
        if (fatigueScore === -1.0) return; // Jangan tambahkan jika tidak ada wajah

        const now = new Date();
        const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        fatigueLineChart.data.labels.push(label);
        fatigueLineChart.data.datasets[0].data.push(fatigueScore);

        const MAX_DATA_POINTS = 10;
        if (fatigueLineChart.data.labels.length > MAX_DATA_POINTS) {
            fatigueLineChart.data.labels.shift();
            fatigueLineChart.data.datasets[0].data.shift();
        }
        fatigueLineChart.update();
    }

    // Update grafik bar emosi
    function updateEmotionChart(emotion) {
        const labels = emotionBarChart.data.labels;
        const data = emotionBarChart.data.datasets[0].data;
        
        const index = labels.indexOf(emotion.charAt(0).toUpperCase() + emotion.slice(1));
        if (index !== -1) {
            data[index]++; // Tambahkan 1 ke count emosi yang terdeteksi
            emotionBarChart.update();
        }
    }

    // Tampilkan / Sembunyikan Loader (DIUBAH)
    // Kita tidak lagi menyembunyikan 'statusResult'
    function showLoading(isLoading) {
        if (isLoading) {
            loader.style.display = 'block';
        } else {
            loader.style.display = 'none';
        }
    }

    // --- 7. Panggil Fungsi Load Data ---
    loadInitialChartData();
});