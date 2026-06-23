"use strict";

// --- Open-Meteo WMO weather code -> { label, icon } ---
const WEATHER_CODES = {
  0:  ["Clear sky", "☀️"],
  1:  ["Mainly clear", "🌤️"],
  2:  ["Partly cloudy", "⛅"],
  3:  ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Violent rain showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm w/ hail", "⛈️"],
  99: ["Thunderstorm w/ hail", "⛈️"],
};

function describeCode(code) {
  return WEATHER_CODES[code] || ["Unknown", "❓"];
}

// --- DOM helpers ---
const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", Boolean(isError));
}

// --- API calls ---
async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not reach the geocoding service.");
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Couldn't find a place called "${city}".`);
  }
  const r = data.results[0];
  const place = [r.name, r.admin1, r.country_code].filter(Boolean).join(", ");
  return { lat: r.latitude, lon: r.longitude, place };
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    timezone: "auto",
    forecast_days: "5",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Could not reach the weather service.");
  return res.json();
}

// --- Outfit analysis ---
function analyzeOutfit(w) {
  const feels = w.current.apparent_temperature;
  const code = w.current.weather_code;
  const wind = w.current.wind_speed_10m;
  const rainChance = w.daily.precipitation_probability_max[0] ?? 0;
  const uv = w.daily.uv_index_max[0] ?? 0;
  const isSnow = [71, 73, 75, 77, 85, 86].includes(code);
  const isRain = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code);

  const items = [];
  let summary;

  if (feels >= 28) {
    summary = "It's hot — keep it light and breathable.";
    items.push("Shorts and a t-shirt or breathable top");
    items.push("Sunglasses and stay hydrated");
  } else if (feels >= 20) {
    summary = "Warm and pleasant — easy clothing weather.";
    items.push("T-shirt with light trousers or shorts");
    items.push("A light layer for the evening just in case");
  } else if (feels >= 12) {
    summary = "Mild — a light layer will keep you comfortable.";
    items.push("Long sleeves or a light sweater");
    items.push("A light jacket if you'll be out a while");
  } else if (feels >= 4) {
    summary = "Chilly — bundle up a bit.";
    items.push("Warm jacket or coat");
    items.push("A sweater underneath and long trousers");
  } else {
    summary = "Cold — dress in warm layers.";
    items.push("Heavy coat, hat, gloves, and scarf");
    items.push("Thermal base layer if heading out for long");
  }

  if (isRain || rainChance >= 50) {
    items.push(`Bring an umbrella or waterproof jacket (${rainChance}% rain chance)`);
  }
  if (isSnow) {
    items.push("Waterproof boots with good grip for snow");
  }
  if (wind >= 30) {
    items.push(`Windproof outer layer (winds around ${Math.round(wind)} km/h)`);
  }
  if (uv >= 6) {
    items.push(`Sunscreen — UV index is high (${Math.round(uv)})`);
  }

  return { summary, items };
}

// --- Rendering ---
function render(place, w) {
  $("place").textContent = place;

  const [desc, icon] = describeCode(w.current.weather_code);
  $("now-icon").textContent = icon;
  $("now-desc").textContent = desc;
  $("now-temp").textContent = `${Math.round(w.current.temperature_2m)}°C`;
  $("now-feels").textContent = `feels like ${Math.round(w.current.apparent_temperature)}°C`;

  $("humidity").textContent = `${w.current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(w.current.wind_speed_10m)} km/h`;
  $("highlow").textContent = `${Math.round(w.daily.temperature_2m_max[0])}° / ${Math.round(w.daily.temperature_2m_min[0])}°`;
  $("rain").textContent = `${w.daily.precipitation_probability_max[0] ?? 0}%`;
  $("uv").textContent = `${Math.round(w.daily.uv_index_max[0] ?? 0)}`;

  const { summary, items } = analyzeOutfit(w);
  $("outfit-summary").textContent = summary;
  const list = $("outfit-list");
  list.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  }

  renderForecast(w.daily);
  $("result").classList.remove("hidden");
}

function renderForecast(daily) {
  const container = $("forecast-days");
  container.innerHTML = "";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < daily.time.length; i++) {
    const [, icon] = describeCode(daily.weather_code[i]);
    const date = new Date(daily.time[i] + "T00:00");
    const name = i === 0 ? "Today" : dayNames[date.getDay()];

    const el = document.createElement("div");
    el.className = "fday";
    el.innerHTML = `
      <div class="fday-name">${name}</div>
      <div class="fday-icon">${icon}</div>
      <div class="fday-temp">
        <span class="hi">${Math.round(daily.temperature_2m_max[i])}°</span>
        <span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span>
      </div>`;
    container.appendChild(el);
  }
}

// --- Flow ---
async function analyzeCity(city) {
  try {
    setStatus("Finding location…");
    const { lat, lon, place } = await geocode(city);
    setStatus("Fetching weather…");
    const weather = await fetchWeather(lat, lon);
    render(place, weather);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function analyzeCoords(lat, lon) {
  try {
    setStatus("Fetching weather…");
    const weather = await fetchWeather(lat, lon);
    render("Your location", weather);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }
}

// --- Events ---
$("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const city = $("city-input").value.trim();
  if (city) analyzeCity(city);
});

$("locate-btn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation isn't supported by your browser.", true);
    return;
  }
  setStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => analyzeCoords(pos.coords.latitude, pos.coords.longitude),
    () => setStatus("Couldn't get your location. Try searching by city.", true)
  );
});

// Show something useful on first load.
window.addEventListener("DOMContentLoaded", () => {
  $("city-input").value = "London";
  analyzeCity("London");
});
