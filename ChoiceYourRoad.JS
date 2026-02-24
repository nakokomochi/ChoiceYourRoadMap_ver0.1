let selectedCity = "";
let map;
let marker;       // 目的地ピン（赤）
let startMarker;  // 出発地ピン（青）
let startLat;
let startLng;
const HIGHWAY_SPEED = 80;
const LOCAL_SPEED = 40;
const TOKYO_STATION_POSITION = {
        center: { lat: 35.681236, lng: 139.767125 }, // 東京駅
        zoom: 12,
        gestureHandling: "cooperative"
    }

// ===============================
// Google Map 初期表示
// ===============================
function initMap() {
    map = new google.maps.Map(document.getElementById("map"),TOKYO_STATION_POSITION);
}

// ===============================
// ランダム地点開始！
// ===============================
function searchSpot() {

    const startAddress = document.getElementById("startLocation").value;

    if (!startAddress) {
        alert("出発地を入力してね！");
        return;
    }

    const time = Number(document.getElementById("timeSelect").value);
    const highway = document.getElementById("highway").value;

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: startAddress }, function (results, status) {

        if (status !== "OK" || !results[0]) {
            alert("出発地を取得できませんでした");
            return;
        }

        // 🔥 これが必要
        const startLat = results[0].geometry.location.lat();
        const startLng = results[0].geometry.location.lng();

        const maxDistance = maxDistanceByTime(time, highway);

        findValidPoint(startLat, startLng, maxDistance, geocoder, time, highway);;

        // 逆ジオコーディング
        geocoder.geocode(
            { location: { lat: point.lat, lng: point.lng } },
            function (results, status) {

                let prefecture = "";
                let city = "";

                if (status === "OK" && results[0]) {

                    for (const comp of results[0].address_components) {

                        if (comp.types.includes("administrative_area_level_1")) {
                            prefecture = comp.long_name;
                        }

                        if (
                            comp.types.includes("locality") ||
                            comp.types.includes("administrative_area_level_2")
                        ) {
                            city = comp.long_name;
                        }
                    }
                }

                document.getElementById("result").innerHTML =
                    `<h2 style="color:red;">${prefecture}${city}</h2>
                     🚗約${distance.toFixed(1)}km<br>
                     ⏱ ${time}分 / 🛣 ${highway === "yes" ? "高速あり" : "下道のみ"}`;

                moveToNearestLand(point.lat, point.lng, function(newLat, newLng) {
                showMap(newLat, newLng);
                });
            }
        );
    });
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
// 地図更新（ピン1本）
// ===============================
function showMap(lat, lng) {
    map.setCenter({ lat, lng });

    if (marker) marker.setMap(null);

    marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: {
            url: "dog.png",
            scaledSize: new google.maps.Size(60, 60)
        }
    });
}

// ===============================
// 時間 → 距離計算
// ===============================
function maxDistanceByTime(time, highway) {
    const hours = time / 60;

    let speed;
    if (highway === "yes") {
        speed = HIGHWAY_SPEED; // 高速あり
    } else {
        speed = LOCAL_SPEED; // 下道のみ
    }

    return hours * speed;
}

// ===============================
// 距離計算（km）
// ===============================
function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getPrefCity(lat, lng) {
  const geocoder = new google.maps.Geocoder();
  const latlng = { lat: lat, lng: lng };

  geocoder.geocode({ location: latlng }, function(results, status) {
    if (status === "OK") {
      if (results[0]) {

        let pref = "";
        let city = "";

        results[0].address_components.forEach(function(component) {

          if (component.types.includes("administrative_area_level_1")) {
            pref = component.long_name;   // 都道府県
          }

          if (
            component.types.includes("locality") ||
            component.types.includes("administrative_area_level_2")
          ) {
            city = component.long_name;   // 市町村
          }

        });

        document.getElementById("results").innerText =
          pref + city;
      }
    }
  });
}

// ===============================
// 時間が30分のとき高速を無効化
// ===============================
function updateHighwayControl() {
    const time = document.getElementById("timeSelect").value;
    const highwaySelect = document.getElementById("highway");

    if (time === "30") {
        highwaySelect.value = "no";     // 下道のみ固定
        highwaySelect.disabled = true;  // 選択不可
    } else {
        highwaySelect.disabled = false; // 選択可能に戻す
    }
}

// 時間変更時に発動
document.getElementById("timeSelect")
    .addEventListener("change", updateHighwayControl);

// ページ読み込み時にもチェック
window.addEventListener("load", updateHighwayControl);

// ===============================
// 海を避けて有効地点を探す
// ===============================
function findValidPoint(startLat, startLng, maxDistance, geocoder, time, highway, attempt = 0) {

    if (attempt > 15) {
        alert("海に当たってしまいました、もう一度回してください_(._.)_");
        return;
    }

    const point = createRandomPoint(startLat, startLng, maxDistance);

    geocoder.geocode(
        { location: { lat: point.lat, lng: point.lng } },
        function (results, status) {

            if (status === "OK" && results[0]) {

                let prefecture = "";
                let city = "";

                for (const comp of results[0].address_components) {

                    if (comp.types.includes("administrative_area_level_1")) {
                        prefecture = comp.long_name;
                    }

                    if (
                        comp.types.includes("locality") ||
                        comp.types.includes("administrative_area_level_2")
                    ) {
                        city = comp.long_name;
                    }
                }

                // 都道府県が取れればOK（＝海じゃない可能性高い）
                if (prefecture) {

                    const distance = calcDistance(startLat, startLng, point.lat, point.lng);

                    document.getElementById("result").innerHTML =
                        `<h2 style="color:red;">${prefecture}${city}</h2>
                         🚗約${distance.toFixed(1)}km<br>
                         ⏱ ${time}分 / 🛣 ${highway === "yes" ? "高速あり" : "下道のみ"}`;
                        showResultWithEffect();

                    showMap(point.lat, point.lng);
                    return;
                }
            }

            // ダメなら再チャレンジ
            findValidPoint(startLat, startLng, maxDistance, geocoder, time, highway, attempt + 1);
        }
    );
}

// ===============================
// 海だったら近くの陸地に補正
// ===============================
function moveToNearestLand(lat, lng, callback) {

    const service = new google.maps.places.PlacesService(map);

    service.nearbySearch(
        {
            location: { lat: lat, lng: lng },
            radius: 3000, // 3km以内を検索
        },
        function (results, status) {

            if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                const landLocation = results[0].geometry.location;
                callback(landLocation.lat(), landLocation.lng());
            } else {
                // 見つからなければそのまま
                callback(lat, lng);
            }
        }
    );
}

// ===============================
// 車で到達可能かチェック
// ===============================
function isReachableByRoad(startLat, startLng, targetLat, targetLng, callback) {

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
        {
            origin: { lat: startLat, lng: startLng },
            destination: { lat: targetLat, lng: targetLng },
            travelMode: google.maps.TravelMode.DRIVING,
        },
        function (result, status) {
            if (status === "OK") {
                callback(true);
            } else {
                callback(false);
            }
        }
    );
}

function showResultWithEffect() {
  const box = document.getElementById("resultsBox");

  // アニメーションリセット
  box.classList.remove("show");
  void box.offsetWidth;

  box.classList.add("show");

  launchConfetti();
}

function launchConfetti() {
  const colors = ["#ff7675", "#74b9ff", "#55efc4", "#ffeaa7", "#a29bfe"];

  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");

    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = 2 + Math.random() * 2 + "s";

    document.body.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 4000);
  }
}