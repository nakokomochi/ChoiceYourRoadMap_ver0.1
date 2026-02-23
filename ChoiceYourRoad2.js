// ===============================
// 変数
// ===============================
let map;
let marker;
const HIGHWAY_SPEED = 80;
const LOCAL_SPEED = 40;

// ===============================
// Leaflet 初期化
// ===============================
function initMap() {
  map = L.map('map').setView([35.681236, 139.767125], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
}

window.onload = initMap;


// ===============================
// 住所 → 緯度経度（Nominatim）
// ===============================
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "ChoiceYourRoadApp/1.0" }
  });

  const data = await res.json();

  if (!data.length) throw new Error("住所が見つかりませんでした");

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}


// ===============================
// 緯度経度 → 住所（Nominatim Reverse）
// ===============================
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "ChoiceYourRoadApp/1.0" }
  });

  const data = await res.json();
  const a = data.address || {};

  // 都道府県
  const prefecture = a.state || a.province || "";

  // 市町村
  const city =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    "";

  return { prefecture, city };
}


// ===============================
// ランダム地点開始
// ===============================
async function searchSpot() {
  const startAddress = document.getElementById("startLocation").value;

  if (!startAddress) {
    alert("出発地を入力してね！");
    return;
  }

  const time = Number(document.getElementById("timeSelect").value);
  const highway = document.getElementById("highway").value;

  try {
    const { lat: startLat, lng: startLng } = await geocode(startAddress);

    const maxDistance = maxDistanceByTime(time, highway);

    findValidPoint(startLat, startLng, maxDistance, time, highway);

  } catch (e) {
   alert(`住所の取得に失敗しました：${e.message}
        もう一度ボタンを押してみてください！`);

  }
}


// ===============================
// ランダム地点生成（距離内）
// ===============================
function createRandomPoint(lat, lng, maxDistanceKm) {
  const radiusInDegrees = maxDistanceKm / 111;

  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;

  const newLat = lat + w * Math.cos(t);
  const newLng = lng + w * Math.sin(t) / Math.cos(lat * Math.PI / 180);

  return { lat: newLat, lng: newLng };
}


// ===============================
// 有効地点を探す（高速版）
// ===============================
async function findValidPoint(startLat, startLng, maxDistance, time, highway, attempt = 0) {
  if (attempt > 15) {
    alert("海に当たってしまいました、もう一度回してください_(._.)_");
    return;
  }

  const point = createRandomPoint(startLat, startLng, maxDistance);

  // reverseGeocode で陸地判定も兼ねる
  const { prefecture, city } = await reverseGeocode(point.lat, point.lng);

  if (!prefecture) {
    return findValidPoint(startLat, startLng, maxDistance, time, highway, attempt + 1);
  }

  const distance = calcDistance(startLat, startLng, point.lat, point.lng);

  document.getElementById("result").innerHTML =
    `<h2 style="color:red;">${prefecture}${city}</h2>
     🚗約${distance.toFixed(1)}km<br>
     ⏱ ${time}分 / 🛣 ${highway === "yes" ? "高速あり" : "下道のみ"}`;

  showMap(point.lat, point.lng);
}


// ===============================
// 地図更新（Leaflet）
// ===============================
function showMap(lat, lng) {
  map.setView([lat, lng], 12);

  if (marker) map.removeLayer(marker);

  const dogIcon = L.icon({
    iconUrl: "dog.png",
    iconSize: [60, 60],   // サイズ調整
    iconAnchor: [30, 60], // ピンの先端位置（画像の下中央）
  });

  marker = L.marker([lat, lng], { icon: dogIcon }).addTo(map);
}



// ===============================
// 時間 → 距離計算
// ===============================
function maxDistanceByTime(time, highway) {
  const hours = time / 60;
  const speed = highway === "yes" ? HIGHWAY_SPEED : LOCAL_SPEED;
  return hours * speed;
}


// ===============================
// 距離計算（km）
// ===============================
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// ===============================
// 時間30分 → 高速無効化
// ===============================
function updateHighwayControl() {
  const time = document.getElementById("timeSelect").value;
  const highwaySelect = document.getElementById("highway");

  if (time === "30") {
    highwaySelect.value = "no";
    highwaySelect.disabled = true;
  } else {
    highwaySelect.disabled = false;
  }
}

document.getElementById("timeSelect").addEventListener("change", updateHighwayControl);
window.addEventListener("load", updateHighwayControl);
