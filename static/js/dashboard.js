// Menjalankan kode hanya setelah seluruh halaman HTML dimuat
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Referensi ke Elemen-elemen HTML ---
    const video = document.getElementById('webcam');
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    
    const statusEmotion = document.getElementById('statusEmotion');
    const statusFatigue = document.getElementById('statusFatigue');
    const loader = document.getElementById('loader');
    const statusResult = document.getElementById('statusResult');

    // Variabel untuk menyimpan stream webcam dan interval
    let stream = null;
    let analysisInterval = null;
    const ANALYSIS_DELAY = 5000; // Analisis setiap 5 detik

    // --- 2. Inisialisasi Grafik (Chart.js) ---
    const ctx = document.getElementById('healthChart').getContext('2d');
    const healthChart = new Chart(ctx, {
        type: 'line', // Jenis grafik
        data: {
            labels: [], // Sumbu X (waktu)
            datasets: [
                {
                    label: 'Skor Kelelahan (1=Lelah, 0=Bangun)',
                    data: [], // Sumbu Y untuk kelelahan
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'yFatigue', // Tautkan ke sumbu Y kiri
                },
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: { display: true, text: 'Waktu' }
                },
                // Sumbu Y Kiri untuk Kelelahan
                yFatigue: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Skor Kelelahan' },
                    min: -1,
                    max: 1 
                }
            }
        }
    });

    // ==========================================================
    // --- FUNGSI BARU UNTUK MEMUAT DATA HISTORI ---
    // ==========================================================
    async function loadInitialChartData() {
        try {
            const response = await fetch('/api/logs'); // Panggil API log
            if (!response.ok) {
                console.error("Gagal memuat log histori");
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.logs) {
                const labels = [];
                const fatigueData = [];
                
                // Proses data log
                data.logs.forEach(log => {
                    const ts = new Date(log.timestamp);
                    // Format waktu agar rapi
                    const label = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}`;
                    
                    // Hanya tampilkan data valid di grafik (bukan 'N/A')
                    if(log.fatigue_score > -1.0) {
                        labels.push(label);
                        fatigueData.push(log.fatigue_score);
                    }
                });

                // Batasi data (misal 50 poin terakhir)
                const MAX_POINTS = 50;
                healthChart.data.labels = labels.slice(-MAX_POINTS);
                healthChart.data.datasets[0].data = fatigueData.slice(-MAX_POINTS);
                
                // Perbarui grafik dengan data histori
                healthChart.update();
            }
            
        } catch (error) {
            console.error("Error memuat data grafik:", error);
        }
    }

    // --- 3. Logika Tombol ---

    // A. Tombol START
    btnStart.addEventListener('click', async () => {
        try {
            // 1. Minta akses webcam
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            
            // 2. Tampilkan stream di elemen <video>
            video.srcObject = stream;
            video.play(); // Mulai memutar video

            // 3. Ubah status tombol
            btnStart.disabled = true;
            btnStop.disabled = false;
            statusEmotion.textContent = 'Memulai...';
            statusFatigue.textContent = 'Memulai...';

            // 4. Mulai interval analisis
            // Panggil 'sendFrame' segera, lalu ulangi setiap 5 detik
            sendFrame(); // Panggil pertama kali
            analysisInterval = setInterval(sendFrame, ANALYSIS_DELAY);

        } catch (error) {
            console.error('Error saat mengakses webcam:', error);
            alert('Tidak dapat mengakses webcam. Pastikan Anda memberikan izin.');
        }
    });

    // B. Tombol STOP
    btnStop.addEventListener('click', () => {
        if (stream) {
            // 1. Matikan semua track (lampu webcam mati)
            stream.getTracks().forEach(track => track.stop());
        }
        
        // 2. Hentikan interval
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }

        // 3. Ubah status tombol dan teks
        btnStart.disabled = false;
        btnStop.disabled = true;
        video.srcObject = null; // Hentikan pemutaran
        statusEmotion.textContent = 'Menunggu';
        statusFatigue.textContent = 'Menunggu';
        hideLoading();
    });

    // --- 4. Fungsi Inti: Kirim Frame ke Backend ---
    
    async function sendFrame() {
        if (!stream || video.readyState < video.HAVE_CURRENT_DATA) {
            // Jika video belum siap, jangan lakukan apa-apa
            return;
        }

        // Tampilkan loader, sembunyikan hasil sebelumnya
        showLoading();

        // 1. Ambil gambar dari <video> dan ubah ke Base64
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        
        // Cerminkan gambar saat menggambar di canvas
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 'toDataURL' membuat string Base64
        const imageDataBase64 = canvas.toDataURL('image/jpeg');

        try {
            // 2. Kirim data ke API (seperti di Postman)
            const response = await fetch('/api/analyze_frame', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image_data: imageDataBase64 })
            });

            // Sembunyikan loader setelah data kembali
            hideLoading();

            if (!response.ok) {
                // Jika server error (500) atau (400)
                console.error('API Error:', response.status, await response.text());
                updateStatusUI('error', 'error');
                return;
            }

            // 3. Terima hasil JSON
            const result = await response.json();

            // 4. Update UI (teks status dan grafik)
            updateStatusUI(result.emotion, result.fatigue_score);
            updateChart(result.fatigue_score); // Ini fungsi update real-time

        } catch (error) {
            console.error('Gagal mengirim frame:', error);
            hideLoading();
            updateStatusUI('offline', 'offline');
        }
    }

    // --- 5. Fungsi Pembantu (Helper) ---

    function updateStatusUI(emotion, fatigue) {
        // A. Update Teks Emosi
        statusEmotion.textContent = emotion;
        // Ubah warna badge berdasarkan emosi
        switch(emotion) {
            case 'happy': statusEmotion.className = 'badge bg-success'; break;
            case 'sad': statusEmotion.className = 'badge bg-primary'; break;
            case 'angry': statusEmotion.className = 'badge bg-danger'; break;
            case 'neutral': statusEmotion.className = 'badge bg-info'; break;
            case 'no_face_detected': statusEmotion.className = 'badge bg-warning'; break;
            default: statusEmotion.className = 'badge bg-secondary';
        }

        // B. Update Teks Kelelahan
        let fatigueText = 'N/A';
        let fatigueClass = 'badge bg-secondary';

        if (fatigue === 0.0) {
            fatigueText = 'Bangun';
            fatigueClass = 'badge bg-success';
        } else if (fatigue === 1.0) {
            fatigueText = 'Lelah (Mata Terpejam)';
            fatigueClass = 'badge bg-danger';
        } else if (fatigue === -1.0) {
            fatigueText = 'Tidak Ada Wajah';
            fatigueClass = 'badge bg-warning';
        }

        statusFatigue.textContent = fatigueText;
        statusFatigue.className = fatigueClass;
    }

    // Ini adalah fungsi untuk update REAL-TIME
    function updateChart(fatigueScore) {
        // Hanya tambahkan ke grafik jika skornya valid (bukan N/A)
        if (fatigueScore === -1.0) return;

        const now = new Date();
        const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        // Tambahkan data baru
        healthChart.data.labels.push(label);
        healthChart.data.datasets[0].data.push(fatigueScore); // [0] = dataset Kelelahan

        // Batasi data agar grafik tidak terlalu penuh (misal: 10 poin data)
        const MAX_DATA_POINTS = 10;
        if (healthChart.data.labels.length > MAX_DATA_POINTS) {
            healthChart.data.labels.shift(); // Hapus data terlama
            healthChart.data.datasets[0].data.shift(); // Hapus data terlama
        }

        // Perbarui grafik
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

    // ==========================================================
    // --- PANGGIL FUNGSI BARU SAAT HALAMAN DIMUAT ---
    // ==========================================================
    loadInitialChartData();
});