document.addEventListener('DOMContentLoaded', () => {
    
    // Referensi ke elemen-elemen di heart_predictor.html
    const heartForm = document.getElementById('heart-form');
    const loader = document.getElementById('heart-loader');
    const resultContainer = document.getElementById('heart-result-container');
    const resultText = document.getElementById('heart-result-text');
    const resultScore = document.getElementById('heart-result-score');
    const prompt = document.getElementById('heart-prompt');

    // === TAMBAHAN: Referensi ke Canvas & Variabel Chart ===
    const ctx = document.getElementById('heartGaugeChart').getContext('2d');
    let heartGaugeChart = null; // Variabel untuk menyimpan objek chart

    // Tambahkan event listener ke formulir
    heartForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);

        const formData = new FormData(heartForm);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = Number(value); 
        });

        try {
            const response = await fetch('/api/predict_heart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            showLoading(false); 

            if (!response.ok) {
                const errorData = await response.json();
                showResult('error', 0, `Error: ${errorData.error}`);
                return;
            }

            const result = await response.json();
            showResult(result.prediction_class, result.prediction_score);

        } catch (error) {
            console.error('Error saat submit formulir:', error);
            showLoading(false);
            showResult('error', 0, `Error: ${error.message}`);
        }
    });

    function showLoading(isLoading) {
        if (isLoading) {
            loader.style.display = 'block';
            resultContainer.style.display = 'none';
            prompt.style.display = 'none';
        } else {
            loader.style.display = 'none';
        }
    }
    
    function showResult(predClass, score, errorMessage = null) {
        resultContainer.style.display = 'block';
        prompt.style.display = 'none';

        if (errorMessage) {
            resultText.textContent = 'Gagal';
            resultText.className = 'mb-2 text-danger';
            resultScore.textContent = errorMessage;
            // Sembunyikan chart jika error
            if(heartGaugeChart) heartGaugeChart.destroy();
            document.getElementById('heartGaugeChart').style.display = 'none';
            return;
        }

        const scorePercent = (score * 100).toFixed(2);
        
        // === TAMBAHAN: Panggil fungsi untuk membuat chart ===
        // Kirim 'score' (nilai 0-1) dan 'predClass' (0 atau 1)
        createGaugeChart(score, predClass);
        document.getElementById('heartGaugeChart').style.display = 'block';


        if (predClass === 1) {
            // Pasien berisiko
            resultText.textContent = 'Risiko Tinggi';
            resultText.className = 'mb-2 text-danger';
            resultScore.textContent = `Probabilitas: ${scorePercent}%`;
        } else {
            // Pasien normal
            resultText.textContent = 'Risiko Rendah';
            resultText.className = 'mb-2 text-success';
            resultScore.textContent = `Probabilitas: ${scorePercent}%`;
        }
    }

    // === FUNGSI BARU UNTUK MEMBUAT GAUGE CHART ===
    function createGaugeChart(score, predClass) {
        // Hancurkan chart lama jika ada, agar tidak tumpang tindih
        if (heartGaugeChart) {
            heartGaugeChart.destroy();
        }

        // Tentukan warna berdasarkan risiko
        // Jika berisiko (class=1), warna utama Merah.
        // Jika risiko rendah (class=0), warna utama Hijau.
        const mainColor = (predClass === 1) ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)';
        const grayColor = 'rgba(230, 230, 230, 1)';

        heartGaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Risiko', 'Aman'],
                datasets: [{
                    label: 'Probabilitas Risiko',
                    // Data: [nilai_skor, sisa_skor]
                    data: [score, 1 - score],
                    backgroundColor: [mainColor, grayColor],
                    borderColor: [mainColor, grayColor],
                    borderWidth: 1
                }]
            },
            options: {
                // Konfigurasi untuk membuatnya jadi 1/2 lingkaran (gauge)
                rotation: -90, // 270 derajat
                circumference: 180, // 180 derajat
                cutout: '80%', // Ketebalan
                responsive: true,
                plugins: {
                    // Sembunyikan legenda dan tooltip
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    }
});