const apiKey = "57a3908223c54272932111631250906"; // Your WeatherAPI key
const apiUrl = "http://api.weatherapi.com/v1";

// DOM Elements
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const getLocationBtn = document.getElementById("getLocationBtn");
const errorMessage = document.getElementById("errorMessage");
const loadingSpinner = document.getElementById("loadingSpinner");
const weatherData = document.getElementById("weatherData");
const currentCity = document.getElementById("currentCity");
const localTime = document.getElementById("localTime");
const weatherIcon = document.getElementById("weatherIcon");
const temp = document.getElementById("temp");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const uvIndex = document.getElementById("uvIndex");
const airQuality = document.getElementById("airQuality");
const forecast = document.getElementById("forecast");
const autocompleteList = document.getElementById("autocompleteList");
const toggleTheme = document.getElementById("toggleTheme");
const canvas = document.getElementById("weatherCanvas");
const ctx = canvas.getContext("2d");

let timeInterval = null;
let animationFrameId = null;
let particles = [];

// Initialize Theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  toggleTheme.checked = true;
}

// Toggle Dark Mode
toggleTheme.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
});

// Canvas Setup
function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// Particle for Rain/Snow
class Particle {
  constructor(type) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.type = type;
    this.speed = type === "rain" ? 5 + Math.random() * 5 : 2 + Math.random() * 2;
    this.size = type === "rain" ? 2 + Math.random() * 2 : 3 + Math.random() * 3;
    this.angle = type === "rain" ? Math.PI / 4 : 0;
  }

  update() {
    this.y += this.speed;
    if (this.type === "rain") this.x += Math.sin(this.angle) * this.speed;
    if (this.y > canvas.height) {
      this.y = 0;
      this.x = Math.random() * canvas.width;
    }
  }

  draw() {
    ctx.fillStyle = this.type === "rain" ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.9)";
    if (this.type === "rain") {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.size * 2, this.y - this.size * 4);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = this.size;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Animate Canvas
function animateCanvas(condition) {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  particles = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("shower")) {
    for (let i = 0; i < 100; i++) particles.push(new Particle("rain"));
  } else if (condition.includes("snow") || condition.includes("sleet")) {
    for (let i = 0; i < 50; i++) particles.push(new Particle("snow"));
  } else {
    return;
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();
}

// Update Local Time
function updateLocalTime(localtimeEpoch) {
  clearInterval(timeInterval);
  let epoch = localtimeEpoch;
  function tick() {
    const now = new Date(epoch * 1000);
    localTime.textContent = `Local Time: ${now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    })}`;
    epoch += 1;
  }
  tick();
  timeInterval = setInterval(tick, 1000);
}

// Fetch Weather by City
async function fetchWeather(city) {
  try {
    loadingSpinner.classList.remove("hidden");
    const response = await fetch(`${apiUrl}/current.json?key=${apiKey}&q=${city}&aqi=yes`);
    if (!response.ok) throw new Error("City not found");
    const data = await response.json();
    displayCurrentWeather(data);
    updateLocalTime(data.location.localtime_epoch);
    await fetchForecast(city);
    updateBackground(data.current.condition.text, data.current.temp_c);
    errorMessage.style.display = "none";
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
    weatherData.classList.add("hidden");
    forecast.classList.add("hidden");
    clearInterval(timeInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } finally {
    loadingSpinner.classList.add("hidden");
  }
}

// Fetch Weather by Coordinates
async function fetchWeatherByCoords(lat, lon) {
  try {
    loadingSpinner.classList.remove("hidden");
    const response = await fetch(`${apiUrl}/current.json?key=${apiKey}&q=${lat},${lon}&aqi=yes`);
    if (!response.ok) throw new Error("Unable to fetch weather");
    const data = await response.json();
    displayCurrentWeather(data);
    updateLocalTime(data.location.localtime_epoch);
    await fetchForecast(`${lat},${lon}`);
    updateBackground(data.current.condition.text, data.current.temp_c);
    errorMessage.style.display = "none";
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
    weatherData.classList.add("hidden");
    forecast.classList.add("hidden");
    clearInterval(timeInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } finally {
    loadingSpinner.classList.add("hidden");
  }
}

// Fetch 5-Day Forecast
async function fetchForecast(query) {
  try {
    loadingSpinner.classList.remove("hidden");
    const response = await fetch(`${apiUrl}/forecast.json?key=${apiKey}&q=${query}&days=5&aqi=yes`);
    if (!response.ok) throw new Error("Unable to fetch forecast");
    const data = await response.json();
    displayForecast(data);
  } catch (error) {
    console.error("Forecast error:", error);
  } finally {
    loadingSpinner.classList.add("hidden");
  }
}

// Fetch Autocomplete Suggestions
async function fetchAutocomplete(query) {
  try {
    const response = await fetch(`${apiUrl}/search.json?key=${apiKey}&q=${query}`);
    if (!response.ok) throw new Error("Unable to fetch autocomplete");
    const data = await response.json();
    displayAutocomplete(data);
  } catch (error) {
    console.error("Autocomplete error:", error);
    autocompleteList.classList.add("hidden");
  }
}

// Display Current Weather
function displayCurrentWeather(data) {
  currentCity.textContent = `${data.location.name}, ${data.location.country}`;
  weatherIcon.src = `https:${data.current.condition.icon}`;
  temp.textContent = `Temperature: ${Math.round(data.current.temp_c)}°C`;
  description.textContent = `Condition: ${data.current.condition.text}`;
  humidity.textContent = `Humidity: ${data.current.humidity}%`;
  wind.textContent = `Wind Speed: ${data.current.wind_kph} km/h`;
  uvIndex.textContent = `UV Index: ${data.current.uv} (${getUVLevel(data.current.uv)})`;
  airQuality.textContent = `Air Quality: ${data.current.air_quality["us-epa-index"]} (${getAQILevel(data.current.air_quality["us-epa-index"])})`;
  weatherData.classList.remove("hidden");
}

// UV Level Description
function getUVLevel(uv) {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

// AQI Level Description
function getAQILevel(aqi) {
  switch (aqi) {
    case 1: return "Good";
    case 2: return "Moderate";
    case 3: return "Unhealthy for Sensitive Groups";
    case 4: return "Unhealthy";
    case 5: return "Very Unhealthy";
    case 6: return "Hazardous";
    default: return "Unknown";
  }
}

// Display 5-Day Forecast
function displayForecast(data) {
  forecast.innerHTML = "";
  data.forecast.forecastday.slice(0, 5).forEach(day => {
    const date = new Date(day.date);
    const card = document.createElement("div");
    card.classList.add("forecast-card");
    card.innerHTML = `
      <p>${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
      <img src="https:${day.day.condition.icon}" alt="Forecast Icon">
      <p>${Math.round(day.day.avgtemp_c)}°C</p>
      <p>${day.day.condition.text}</p>
    `;
    forecast.appendChild(card);
  });
  forecast.classList.remove("hidden");
}

// Display Autocomplete Suggestions
function displayAutocomplete(cities) {
  autocompleteList.innerHTML = "";
  if (cities.length === 0) {
    autocompleteList.classList.add("hidden");
    return;
  }
  cities.slice(0, 5).forEach(city => {
    const item = document.createElement("div");
    item.classList.add("autocomplete-item");
    item.textContent = `${city.name}, ${city.region}, ${city.country}`;
    item.addEventListener("click", () => {
      cityInput.value = city.name;
      autocompleteList.classList.add("hidden");
      fetchWeather(city.name);
    });
    autocompleteList.appendChild(item);
  });
  autocompleteList.classList.remove("hidden");
}

// Update Background and Canvas
function updateBackground(condition, temp) {
  document.body.classList.remove("bg-sunny", "bg-cloudy", "bg-rainy", "bg-snow", "bg-cold", "bg-cool", "bg-mild", "bg-hot");
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes("sunny") || conditionLower.includes("clear")) {
    document.body.classList.add("bg-sunny");
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } else if (conditionLower.includes("cloud") || conditionLower.includes("overcast")) {
    document.body.classList.add("bg-cloudy");
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } else if (conditionLower.includes("rain") || conditionLower.includes("drizzle") || condition.includes("shower")) {
    document.body.classList.add("bg-rainy");
    animateCanvas("rain");
  } else if (conditionLower.includes("snow") || conditionLower.includes("sleet")) {
    document.body.classList.add("bg-snow");
    animateCanvas("snow");
  } else if (temp < 0) {
    document.body.classList.add("bg-cold");
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } else if (temp < 15) {
    document.body.classList.add("bg-cool");
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } else if (temp < 25) {
    document.body.classList.add("bg-mild");
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  } else {
    document.body.classList.add("bg-hot");
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  }
}

// Event Listeners
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) {
    fetchWeather(city);
    autocompleteList.classList.add("hidden");
  }
});

cityInput.addEventListener("input", () => {
  const query = cityInput.value.trim();
  if (query.length > 2) {
    fetchAutocomplete(query);
  } else {
    autocompleteList.classList.add("hidden");
  }
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) {
      fetchWeather(city);
      autocompleteList.classList.add("hidden");
    }
  }
});

getLocationBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        autocompleteList.classList.add("hidden");
      },
      (error) => {
        errorMessage.textContent = "Unable to access location";
        errorMessage.style.display = "block";
        loadingSpinner.classList.add("hidden");
      }
    );
  } else {
    errorMessage.textContent = "Geolocation is not supported";
    errorMessage.style.display = "block";
    loadingSpinner.classList.add("hidden");
  }
});

// Initialize Canvas
setupCanvas();