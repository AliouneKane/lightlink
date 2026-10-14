"""
LightLink - Ingestion des flux externes (Presse & Météo Accra)
1. Écoute des alertes de presse via Google News RSS (Ghana ECG Dumsor)
2. Récupération de la météo temps réel (Open-Meteo pour Accra)
"""

import urllib.request
import xml.etree.ElementTree as ET
import json
from datetime import datetime

# Coordonnées d'Accra
ACCRA_LAT = 5.56
ACCRA_LNG = -0.20

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q=Ghana+ECG+dumsor+outage&hl=en-GH&gl=GH&ceid=GH:en"
OPEN_METEO_URL = f"https://api.open-meteo.com/v1/forecast?latitude={ACCRA_LAT}&longitude={ACCRA_LNG}&current=temperature_2m,precipitation,rain,wind_speed_10m&hourly=precipitation_probability,rain"

ZONES_KEYWORDS = [
    'osu', 'labone', 'east legon', 'adabraka', 'cantonments',
    'dansoman', 'airport', 'achimota', 'madina', 'tema'
]

def fetch_live_weather():
    """Récupère la météo en direct pour Accra."""
    try:
        req = urllib.request.Request(OPEN_METEO_URL, headers={'User-Agent': 'LightLink/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            current = data.get('current', {})
            print(f"[+] Météo Accra temps réel : {current.get('temperature_2m')}°C | Pluie : {current.get('rain')} mm | Vent : {current.get('wind_speed_10m')} km/h")
            return {
                'temp_c': current.get('temperature_2m'),
                'rain_mm': current.get('rain', 0.0),
                'is_storm': current.get('wind_speed_10m', 0) > 30.0 or current.get('rain', 0) > 10.0
            }
    except Exception as e:
        print(f"[-] Erreur météo : {e}")
        return {'temp_c': 28.0, 'rain_mm': 0.0, 'is_storm': False}

def fetch_press_alerts():
    """Scanne les alertes de coupures dans la presse ghanéenne."""
    alerts = []
    try:
        req = urllib.request.Request(GOOGLE_NEWS_RSS, headers={'User-Agent': 'LightLink/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)

            for item in root.findall('.//item')[:15]: # Examiner les 15 derniers articles
                title = item.find('title').text or ""
                link = item.find('link').text or ""
                pub_date = item.find('pubDate').text or ""

                # Détecter si un quartier pilote est mentionné
                matched_zones = [z for z in ZONES_KEYWORDS if z in title.lower()]
                if matched_zones:
                    alerts.append({
                        'title': title,
                        'matched_zones': matched_zones,
                        'link': link,
                        'pub_date': pub_date
                    })

        print(f"[+] Alertes presse détectées : {len(alerts)} articles ciblent nos quartiers pilotes.")
        for a in alerts[:3]:
            print(f"    - [{', '.join(a['matched_zones']).upper()}] {a['title']}")
    except Exception as e:
        print(f"[-] Erreur flux presse : {e}")

    return alerts

if __name__ == "__main__":
    print("[*] Diagnostic des flux externes temps réel...")
    weather = fetch_live_weather()
    alerts = fetch_press_alerts()
