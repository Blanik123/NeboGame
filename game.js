// Получаем элементы
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// Игровые переменные
let gameRunning = false; // Игра начинается на паузе для показа правил
let score = 0;
let totalScore = 0;
let gameSpeed = 4;
let firstLaunch = true;
let playerLevel = 1;
let currentPlane = 0; // Индекс текущего самолёта

// Улучшения стартового самолёта
let planeUpgrades = {
    speed: 0,
    fireRate: 0,
    accuracy: 0
};

// Данные самолётов
const planes = [
    {
        name: "Стартовый истребитель",
        baseSpeed: 5, // Слабая ракета на 1 уровне
        requiredLevel: 1,
        cost: 0,
        owned: true
    },
    {
        name: "Быстрый перехватчик",
        baseSpeed: 7,
        requiredLevel: 5,
        cost: 100,
        owned: false
    },
    {
        name: "Штурмовик",
        baseSpeed: 6,
        requiredLevel: 10,
        cost: 250,
        owned: false
    },
    {
        name: "Сверхзвуковой истребитель",
        baseSpeed: 9,
        requiredLevel: 15,
        cost: 500,
        owned: false
    }
];

// Самолёт
const plane = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100,
    width: 50,
    height: 30,
    speed: 5 // Начальная слабая скорость
};

// Массив облаков
let clouds = [];

// Массив обычных облаков
let normalClouds = [];

// Массив пуль
let bullets = [];

// Массив звёздочек
let stars = [];

// Клавиши
const keys = {
    left: false,
    right: false,
    space: false
};

// Переменная для контроля стрельбы
let lastShotTime = 0;
const baseShotCooldown = 250; // миллисекунды (медленнее на 1 уровне)

// Функции для работы с общим счётом
function loadTotalScore() {
    const saved = localStorage.getItem('planeGameTotalScore');
    return saved ? parseInt(saved) : 0;
}

function saveTotalScore(score) {
    localStorage.setItem('planeGameTotalScore', score.toString());
}

// Загружаем общий счёт при запуске
totalScore = loadTotalScore();

// Функции для работы с уровнями (более сбалансированные)
function calculateLevel(totalScore) {
    if (totalScore < 10) return 1;   // 0-9 очков
    if (totalScore < 25) return 2;   // 10-24 очков
    if (totalScore < 50) return 3;   // 25-49 очков
    if (totalScore < 100) return 4;  // 50-99 очков
    if (totalScore < 175) return 5;  // 100-174 очков
    if (totalScore < 275) return 6;  // 175-274 очков
    if (totalScore < 400) return 7;  // 275-399 очков
    if (totalScore < 550) return 8;  // 400-549 очков
    if (totalScore < 750) return 9;  // 550-749 очков
    if (totalScore < 1000) return 10; // 750-999 очков
    
    // Для уровней 11+ каждые 300 очков = +1 уровень
    return 11 + Math.floor((totalScore - 1000) / 300);
}

function updatePlayerLevel() {
    const newLevel = calculateLevel(totalScore);
    if (newLevel > playerLevel) {
        const oldLevel = playerLevel;
        playerLevel = newLevel;
        
        // Показываем уведомление о новом уровне
        showNotification(`🎉 Поздравляем! Достигнут ${playerLevel} уровень!`);
        
        // Предупреждение о появлении обычных облаков на 4 уровне
        if (playerLevel === 4 && oldLevel < 4) {
            setTimeout(() => {
                showNotification(`⚠️ Внимание! С 4 уровня появляются облака, наносящие урон (-5 очков)!`, 4000);
            }, 3000);
        }
        
        // Разблокировка новых самолётов
        if (playerLevel % 5 === 0 || playerLevel === 1 || playerLevel === 10) {
            setTimeout(() => {
                showNotification(`✈️ Проверьте ангар - возможно доступны новые самолёты!`, 3000);
            }, 6000);
        }
    }
    document.getElementById('playerLevel').textContent = playerLevel;
}

function updatePlaneStats() {
    const currentPlaneData = planes[currentPlane];
    plane.speed = currentPlaneData.baseSpeed + planeUpgrades.speed;
}

function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, duration);
}

// Загружаем улучшения и самолёты
function loadGameData() {
    const saved = localStorage.getItem('planeGameData');
    if (saved) {
        const data = JSON.parse(saved);
        planeUpgrades = data.upgrades || { speed: 0, fireRate: 0, accuracy: 0 };
        currentPlane = data.currentPlane || 0;
        
        // Загружаем владение самолётами
        if (data.ownedPlanes) {
            data.ownedPlanes.forEach((owned, index) => {
                if (planes[index]) planes[index].owned = owned;
            });
        }
    }
}

function saveGameData() {
    const data = {
        upgrades: planeUpgrades,
        currentPlane: currentPlane,
        ownedPlanes: planes.map(p => p.owned)
    };
    localStorage.setItem('planeGameData', JSON.stringify(data));
}

// Обработка нажатий клавиш
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = true;
            e.preventDefault();
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = true;
            e.preventDefault();
            break;
        case 'Space':
            keys.space = true;
            e.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = false;
            break;
        case 'Space':
            keys.space = false;
            break;
    }
});

// Функция создания грозового облака
function createCloud() {
    const cloud = {
        x: Math.random() * (canvas.width - 60),
        y: -50,
        width: 60,
        height: 45,
        speed: gameSpeed
    };
    clouds.push(cloud);
}

// Функция создания обычного облака
function createNormalCloud() {
    const cloud = {
        x: Math.random() * (canvas.width - 70),
        y: -50,
        width: 70,
        height: 50,
        speed: gameSpeed
    };
    normalClouds.push(cloud);
}

// Функция создания пули
function createBullet() {
    const currentTime = Date.now();
    const shotCooldown = baseShotCooldown - (planeUpgrades.fireRate * 30);
    if (currentTime - lastShotTime > shotCooldown) {
        const bullet = {
            x: plane.x + plane.width / 2 - 2,
            y: plane.y,
            width: 4,
            height: 10,
            speed: 15
        };
        bullets.push(bullet);
        lastShotTime = currentTime;
    }
}

// Функция создания звёздочки
function createStar(x, y) {
    const star = {
        x: x,
        y: y,
        width: 20,
        height: 20,
        speed: gameSpeed,
        collected: false
    };
    stars.push(star);
}

// Функция отрисовки военного самолёта
function drawPlane() {
    ctx.save();
    
    // Основной корпус (улучшенный дизайн)
    ctx.fillStyle = '#606060';
    ctx.fillRect(plane.x + 16, plane.y + 6, 18, 24);
    
    // Градиент для объёма корпуса
    const gradient = ctx.createLinearGradient(plane.x + 16, plane.y + 6, plane.x + 34, plane.y + 6);
    gradient.addColorStop(0, '#707070');
    gradient.addColorStop(0.5, '#606060');
    gradient.addColorStop(1, '#505050');
    ctx.fillStyle = gradient;
    ctx.fillRect(plane.x + 16, plane.y + 6, 18, 24);
    
    // Нос самолёта (более острый и детализированный)
    ctx.fillStyle = '#404040';
    ctx.beginPath();
    ctx.moveTo(plane.x + 25, plane.y);
    ctx.lineTo(plane.x + 16, plane.y + 6);
    ctx.lineTo(plane.x + 20, plane.y + 8);
    ctx.lineTo(plane.x + 25, plane.y + 3);
    ctx.lineTo(plane.x + 30, plane.y + 8);
    ctx.lineTo(plane.x + 34, plane.y + 6);
    ctx.closePath();
    ctx.fill();
    
    // Крылья (современный дизайн)
    const wingGradient = ctx.createLinearGradient(plane.x, plane.y + 14, plane.x + 50, plane.y + 14);
    wingGradient.addColorStop(0, '#708090');
    wingGradient.addColorStop(0.5, '#778899');
    wingGradient.addColorStop(1, '#708090');
    ctx.fillStyle = wingGradient;
    ctx.fillRect(plane.x, plane.y + 14, 50, 8);
    
    // Детали крыльев
    ctx.fillStyle = '#556B7D';
    ctx.fillRect(plane.x + 2, plane.y + 16, 46, 2);
    ctx.fillRect(plane.x + 5, plane.y + 19, 40, 1);
    
    // Современное вооружение
    ctx.fillStyle = '#2F2F2F';
    ctx.fillRect(plane.x + 8, plane.y + 12, 6, 12);
    ctx.fillRect(plane.x + 36, plane.y + 12, 6, 12);
    
    // Детали вооружения
    ctx.fillStyle = '#1F1F1F';
    ctx.fillRect(plane.x + 9, plane.y + 13, 4, 2);
    ctx.fillRect(plane.x + 37, plane.y + 13, 4, 2);
    
    // Хвост и стабилизаторы (улучшенные)
    ctx.fillStyle = '#5A5A5A';
    ctx.fillRect(plane.x + 20, plane.y + 26, 10, 4);
    ctx.fillRect(plane.x + 18, plane.y + 22, 14, 3);
    
    // Вертикальный стабилизатор
    ctx.fillStyle = '#505050';
    ctx.fillRect(plane.x + 23, plane.y + 18, 4, 8);
    
    // Кабина пилота (более реалистичная)
    const cockpitGradient = ctx.createRadialGradient(plane.x + 25, plane.y + 12, 0, plane.x + 25, plane.y + 12, 8);
    cockpitGradient.addColorStop(0, '#4169E1');
    cockpitGradient.addColorStop(0.7, '#1E40AF');
    cockpitGradient.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = cockpitGradient;
    ctx.fillRect(plane.x + 20, plane.y + 8, 10, 8);
    
    // Отражение на кабине
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(plane.x + 21, plane.y + 9, 3, 2);
    
    // Камуфляжные полосы (более реалистичные)
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(plane.x + 18, plane.y + 10, 6, 2);
    ctx.fillRect(plane.x + 26, plane.y + 10, 6, 2);
    ctx.fillRect(plane.x + 22, plane.y + 18, 6, 2);
    
    // Звезда (военная маркировка) - более яркая
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const centerX = plane.x + 6;
    const centerY = plane.y + 17;
    for (let i = 0; i < 5; i++) {
        const angle = (i * 144 - 90) * Math.PI / 180;
        const x = centerX + Math.cos(angle) * 4;
        const y = centerY + Math.sin(angle) * 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Двигатели (реактивные сопла)
    ctx.fillStyle = '#2F2F2F';
    ctx.fillRect(plane.x + 12, plane.y + 24, 4, 6);
    ctx.fillRect(plane.x + 34, plane.y + 24, 4, 6);
    
    // Огонь из двигателей
    ctx.fillStyle = '#FF6B35';
    ctx.fillRect(plane.x + 13, plane.y + 28, 2, 3);
    ctx.fillRect(plane.x + 35, plane.y + 28, 2, 3);
    
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(plane.x + 13.5, plane.y + 29, 1, 2);
    ctx.fillRect(plane.x + 35.5, plane.y + 29, 1, 2);
    
    // Антенны и детали
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plane.x + 25, plane.y + 6);
    ctx.lineTo(plane.x + 25, plane.y + 4);
    ctx.stroke();
    
    ctx.restore();
}

// Функция отрисовки пули
function drawBullet(bullet) {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    
    // Добавляем светящийся эффект
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 3;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    
    ctx.restore();
}

// Функция отрисовки звёздочки
function drawStar(star) {
    ctx.save();
    
    const centerX = star.x + star.width / 2;
    const centerY = star.y + star.height / 2;
    
    // Анимация вращения
    const rotation = Date.now() * 0.005;
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    // Звёздочка
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 144) * Math.PI / 180;
        const x = Math.cos(angle) * 8;
        const y = Math.sin(angle) * 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Внутренняя звёздочка
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 144) * Math.PI / 180;
        const x = Math.cos(angle) * 4;
        const y = Math.sin(angle) * 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Светящийся эффект
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fill();
    
    ctx.restore();
}

// Функция отрисовки обычного облака
function drawNormalCloud(cloud) {
    ctx.save();
    
    // Светло-серое обычное облако
    ctx.fillStyle = '#B0C4DE';
    ctx.beginPath();
    
    // Создаём форму облака из кругов
    const centerX = cloud.x + cloud.width / 2;
    const centerY = cloud.y + cloud.height / 2;
    
    ctx.arc(cloud.x + 12, centerY, 12, 0, Math.PI * 2);
    ctx.arc(cloud.x + 28, centerY - 4, 15, 0, Math.PI * 2);
    ctx.arc(cloud.x + 45, centerY, 13, 0, Math.PI * 2);
    ctx.arc(cloud.x + 20, centerY - 8, 10, 0, Math.PI * 2);
    ctx.arc(cloud.x + 37, centerY - 10, 12, 0, Math.PI * 2);
    
    ctx.fill();
    
    // Тень облака
    ctx.fillStyle = '#9FB6CD';
    ctx.beginPath();
    ctx.arc(cloud.x + 15, centerY + 2, 8, 0, Math.PI * 2);
    ctx.arc(cloud.x + 30, centerY + 1, 10, 0, Math.PI * 2);
    ctx.arc(cloud.x + 42, centerY + 2, 9, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Функция отрисовки облака (грозы)
function drawCloud(cloud) {
    ctx.save();
    
    // Тёмное грозовое облако
    ctx.fillStyle = '#2F4F4F';
    ctx.beginPath();
    
    // Создаём форму облака из кругов
    const centerX = cloud.x + cloud.width / 2;
    const centerY = cloud.y + cloud.height / 2;
    
    ctx.arc(cloud.x + 15, centerY, 15, 0, Math.PI * 2);
    ctx.arc(cloud.x + 35, centerY - 5, 18, 0, Math.PI * 2);
    ctx.arc(cloud.x + 55, centerY, 16, 0, Math.PI * 2);
    ctx.arc(cloud.x + 25, centerY - 10, 12, 0, Math.PI * 2);
    ctx.arc(cloud.x + 45, centerY - 12, 14, 0, Math.PI * 2);
    
    ctx.fill();
    
    // Молнии
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const lightningX = centerX + Math.sin(Date.now() * 0.01) * 10;
    ctx.moveTo(lightningX, cloud.y + cloud.height);
    ctx.lineTo(lightningX - 5, cloud.y + cloud.height + 15);
    ctx.lineTo(lightningX + 3, cloud.y + cloud.height + 15);
    ctx.lineTo(lightningX - 2, cloud.y + cloud.height + 25);
    
    ctx.stroke();
    
    ctx.restore();
}

// Функция отрисовки фона
function drawBackground() {
    // Облака на заднем плане (обычные белые)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    
    for (let i = 0; i < 5; i++) {
        const x = (i * 200 + Date.now() * 0.02) % (canvas.width + 100) - 50;
        const y = 50 + i * 30;
        
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 45, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Улучшенная функция проверки столкновений с уменьшенным порогом
function checkCollision(rect1, rect2) {
    // Уменьшаем зону столкновения для более точного попадания
    const margin = 3;
    return rect1.x + margin < rect2.x + rect2.width - margin &&
           rect1.x + rect1.width - margin > rect2.x + margin &&
           rect1.y + margin < rect2.y + rect2.height - margin &&
           rect1.y + rect1.height - margin > rect2.y + margin;
}

// Функция обновления игры
function update() {
    if (!gameRunning) return;
    
    // Движение самолёта
    if (keys.left && plane.x > 0) {
        plane.x -= plane.speed;
    }
    if (keys.right && plane.x < canvas.width - plane.width) {
        plane.x += plane.speed;
    }
    
    // Стрельба
    if (keys.space) {
        createBullet();
    }
    
    // Создание облаков
    if (Math.random() < 0.015) {
        createCloud();
    }
    
    // Создание обычных облаков (только с 4 уровня)
    if (playerLevel >= 4 && Math.random() < 0.01) {
        createNormalCloud();
    }
    
    // Обновление пуль
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        
        // Удаление пуль за пределами экрана
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Проверка столкновения пуль с облаками
        for (let j = clouds.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], clouds[j])) {
                // Создаём звёздочку на месте уничтоженного облака
                createStar(clouds[j].x + clouds[j].width / 2 - 10, clouds[j].y + clouds[j].height / 2 - 10);
                
                // Удаляем облако и пулю
                clouds.splice(j, 1);
                bullets.splice(i, 1);
                break;
            }
        }
    }
    
    // Обновление облаков
    for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].y += clouds[i].speed;
        
        // Проверка столкновения с самолётом
        if (checkCollision(plane, clouds[i])) {
            gameOver();
            return;
        }
        
        // Удаление облаков за пределами экрана
        if (clouds[i].y > canvas.height) {
            clouds.splice(i, 1);
            score += 1;
            
            // Увеличение скорости игры
            if (score % 100 === 0) {
                gameSpeed += 0.5;
            }
        }
    }
    
    // Обновление обычных облаков
    for (let i = normalClouds.length - 1; i >= 0; i--) {
        normalClouds[i].y += normalClouds[i].speed;
        
        // Проверка столкновения с самолётом (урон)
        if (checkCollision(plane, normalClouds[i])) {
            score -= 5;
            if (score < 0) score = 0;
            normalClouds.splice(i, 1);
            continue;
        }
        
        // Удаление облаков за пределами экрана
        if (normalClouds[i].y > canvas.height) {
            normalClouds.splice(i, 1);
        }
    }

    // Обновление звёздочек
    for (let i = stars.length - 1; i >= 0; i--) {
        // Движение звёздочки вниз
        stars[i].y += stars[i].speed;
        
        // Проверка сбора звёздочки
        if (checkCollision(plane, stars[i]) && !stars[i].collected) {
            stars[i].collected = true;
            
            // Очки за звёздочку зависят от уровня
            let starPoints = 1; // По умолчанию 1 очко
            if (playerLevel >= 10) starPoints = 10;
            else if (playerLevel >= 5) starPoints = 5;
            else starPoints = Math.min(playerLevel, 5);
            
            score += starPoints;
            stars.splice(i, 1);
        }
        // Удаление звёздочек, которые упали слишком низко
        else if (stars[i].y > canvas.height) {
            stars.splice(i, 1);
        }
    }
    
    // Обновление счёта
    scoreElement.textContent = score;
    document.getElementById('totalScore').textContent = totalScore;
}

// Функция отрисовки
function draw() {
    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка фона
    drawBackground();
    
    // Отрисовка грозовых облаков
    clouds.forEach(cloud => drawCloud(cloud));
    
    // Отрисовка обычных облаков
    normalClouds.forEach(cloud => drawNormalCloud(cloud));
    
    // Отрисовка пуль
    bullets.forEach(bullet => drawBullet(bullet));
    
    // Отрисовка звёздочек
    stars.forEach(star => drawStar(star));
    
    // Отрисовка самолёта
    drawPlane();
}

// Функция окончания игры
function gameOver() {
    gameRunning = false;
    totalScore += score;
    saveTotalScore(totalScore);
    updatePlayerLevel();
    finalScoreElement.textContent = score;
    document.getElementById('totalScore').textContent = totalScore;
    gameOverElement.style.display = 'block';
}

// Функция перезапуска игры
function restartGame() {
    gameRunning = true;
    score = 0;
    gameSpeed = 4;
    plane.x = canvas.width / 2 - 25;
    clouds = [];
    normalClouds = [];
    bullets = [];
    stars = [];
    keys.left = false;
    keys.right = false;
    keys.space = false;
    lastShotTime = 0;
    firstLaunch = false;
    gameOverElement.style.display = 'none';
    scoreElement.textContent = '0';
}

// Главный игровой цикл
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Функции для работы с меню и модальными окнами
function toggleMenu() {
    const menu = document.getElementById('dropdownMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function showRules() {
    document.getElementById('dropdownMenu').style.display = 'none';
    document.getElementById('rulesModal').style.display = 'block';
}

function showInventory() {
    document.getElementById('dropdownMenu').style.display = 'none';
    document.getElementById('inventoryModal').style.display = 'block';
}

function showLeaderboard() {
    document.getElementById('dropdownMenu').style.display = 'none';
    // Обновляем лучший результат
    const bestScore = Math.max(totalScore, localStorage.getItem('bestScore') || 0);
    localStorage.setItem('bestScore', bestScore);
    document.getElementById('bestScore').textContent = bestScore;
    document.getElementById('leaderboardModal').style.display = 'block';
}

function showShop() {
    document.getElementById('dropdownMenu').style.display = 'none';
    document.getElementById('shopModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function startGame() {
    closeModal('rulesModal');
    gameRunning = true;
    firstLaunch = false;
}

function buyPointsTelegram(amount, price) {
    // Интеграция с Telegram ботом
    const botUsername = 'your_game_bot'; // Замените на имя вашего бота
    const userId = getUserId(); // Функция для получения ID пользователя
    
    const telegramUrl = `https://t.me/${botUsername}?start=buy_${amount}_${price}_${userId}`;
    
    if (window.Telegram && window.Telegram.WebApp) {
        // Если запущено в Telegram WebApp
        window.Telegram.WebApp.openTelegramLink(telegramUrl);
    } else {
        // Обычный браузер
        window.open(telegramUrl, '_blank');
    }
}

function getUserId() {
    // Генерируем или получаем уникальный ID пользователя
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

// Функция для зачисления купленных очков (вызывается ботом)
function addPurchasedPoints(amount) {
    totalScore += amount;
    saveTotalScore(totalScore);
    updatePlayerLevel();
    document.getElementById('totalScore').textContent = totalScore;
    showNotification(`💎 Получено ${amount} очков! Спасибо за покупку!`, 4000);
}

function switchInventoryTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную вкладку
    document.getElementById(tabName + '-tab').style.display = 'block';
    
    // Активируем соответствующую кнопку
    event.target.classList.add('active');
    
    // Обновляем содержимое в зависимости от вкладки
    if (tabName === 'hangar') {
        updateHangarDisplay2();
    } else if (tabName === 'upgrades') {
        updateUpgradeCosts2();
    }
}

function updateHangarDisplay2() {
    const planesGrid = document.getElementById('planesGrid2');
    planesGrid.innerHTML = '';
    
    planes.forEach((planeData, index) => {
        const card = document.createElement('div');
        card.className = 'plane-card';
        
        if (planeData.owned) {
            card.classList.add('owned');
        }
        if (index === currentPlane) {
            card.classList.add('selected');
        }
        
        let buttonText = '';
        let buttonAction = '';
        
        if (!planeData.owned) {
            if (playerLevel >= planeData.requiredLevel) {
                buttonText = `Купить за ${planeData.cost} очков`;
                buttonAction = `onclick="buyPlane2(${index})"`;
            } else {
                buttonText = `Требуется ${planeData.requiredLevel} уровень`;
                buttonAction = 'disabled';
            }
        } else if (index !== currentPlane) {
            buttonText = 'Выбрать';
            buttonAction = `onclick="selectPlane2(${index})"`;
        } else {
            buttonText = 'Выбран';
            buttonAction = 'disabled';
        }
        
        card.innerHTML = `
            <h4>${planeData.name}</h4>
            <p>Скорость: ${planeData.baseSpeed}</p>
            <p>Требуется: ${planeData.requiredLevel} уровень</p>
            <button ${buttonAction}>${buttonText}</button>
        `;
        
        planesGrid.appendChild(card);
    });
    
    document.getElementById('currentPlaneText2').textContent = planes[currentPlane].name;
}

function buyPlane2(index) {
    const planeData = planes[index];
    if (totalScore >= planeData.cost && playerLevel >= planeData.requiredLevel) {
        totalScore -= planeData.cost;
        planeData.owned = true;
        saveTotalScore(totalScore);
        saveGameData();
        updateHangarDisplay2();
        document.getElementById('totalScore').textContent = totalScore;
        showNotification(`✈️ ${planeData.name} куплен!`);
    } else {
        showNotification(`❌ Недостаточно очков или низкий уровень!`);
    }
}

function selectPlane2(index) {
    if (planes[index].owned) {
        currentPlane = index;
        updatePlaneStats();
        saveGameData();
        updateHangarDisplay2();
        showNotification(`✈️ Выбран ${planes[index].name}!`);
    }
}



function upgradeSpeed() {
    const cost = 10 + (planeUpgrades.speed * 5);
    if (totalScore >= cost) {
        totalScore -= cost;
        planeUpgrades.speed++;
        saveTotalScore(totalScore);
        saveGameData();
        updatePlaneStats();
        updateUpgradeCosts();
        document.getElementById('totalScore').textContent = totalScore;
        showNotification(`🚀 Скорость улучшена! (+${planeUpgrades.speed})`);
    } else {
        showNotification(`❌ Недостаточно очков!`);
    }
}

function upgradeFireRate() {
    const cost = 15 + (planeUpgrades.fireRate * 8);
    if (totalScore >= cost) {
        totalScore -= cost;
        planeUpgrades.fireRate++;
        saveTotalScore(totalScore);
        saveGameData();
        updateUpgradeCosts();
        document.getElementById('totalScore').textContent = totalScore;
        showNotification(`⚡ Скорострельность улучшена! (+${planeUpgrades.fireRate})`);
    } else {
        showNotification(`❌ Недостаточно очков!`);
    }
}

function updateUpgradeCosts() {
    if (document.getElementById('speedUpgradeCost')) {
        document.getElementById('speedUpgradeCost').textContent = 10 + (planeUpgrades.speed * 5);
    }
    if (document.getElementById('fireRateUpgradeCost')) {
        document.getElementById('fireRateUpgradeCost').textContent = 15 + (planeUpgrades.fireRate * 8);
    }
}

function updateUpgradeCosts2() {
    document.getElementById('speedUpgradeCost2').textContent = 10 + (planeUpgrades.speed * 5);
    document.getElementById('fireRateUpgradeCost2').textContent = 15 + (planeUpgrades.fireRate * 8);
    document.getElementById('accuracyUpgradeCost').textContent = 20 + (planeUpgrades.accuracy * 10);
}

function upgradeAccuracy() {
    const cost = 20 + (planeUpgrades.accuracy * 10);
    if (totalScore >= cost) {
        totalScore -= cost;
        planeUpgrades.accuracy++;
        saveTotalScore(totalScore);
        saveGameData();
        updateUpgradeCosts2();
        document.getElementById('totalScore').textContent = totalScore;
        showNotification(`🎯 Точность улучшена! (+${planeUpgrades.accuracy})`);
    } else {
        showNotification(`❌ Недостаточно очков!`);
    }
}

function clearProgress() {
    if (confirm('Вы уверены, что хотите удалить весь прогресс? Это действие нельзя отменить!')) {
        localStorage.removeItem('planeGameTotalScore');
        localStorage.removeItem('planeGameData');
        localStorage.removeItem('bestScore');
        location.reload();
    }
}

// Закрытие меню при клике вне его
document.addEventListener('click', function(event) {
    const menu = document.getElementById('dropdownMenu');
    const menuButton = document.getElementById('menuButton');
    
    if (!menuButton.contains(event.target) && !menu.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// Закрытие модальных окон при клике вне их
window.addEventListener('click', function(event) {
    const modals = ['rulesModal', 'inventoryModal', 'leaderboardModal', 'shopModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            closeModal(modalId);
        }
    });
});

// Инициализация интерфейса
loadGameData();
playerLevel = calculateLevel(totalScore);
updatePlaneStats();
updatePlayerLevel();
updateUpgradeCosts();
document.getElementById('totalScore').textContent = totalScore;

// Показ правил при первом запуске
if (firstLaunch) {
    setTimeout(() => {
        showRules();
    }, 500);
}

// Запуск игры
gameLoop();