-- ==============================================================================
-- LIGHTLINK - DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- Version: 1.0 (Phase 2 & 3 Hackathon Tech Hub Africa 2026)
-- Target: Supabase Postgres
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TERRITOIRE & RÉSEAU ÉLECTRIQUE
-- ==============================================================================

-- 1.1 Zones pilotes d'Accra
CREATE TABLE IF NOT EXISTS public.zones (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 1.2 Groupes de délestage officiels ECG (A, B, C, D)
CREATE TABLE IF NOT EXISTS public.ecg_groups (
    id VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);

-- 1.3 Liaison Quartiers <-> Groupes ECG
CREATE TABLE IF NOT EXISTS public.zone_groups (
    zone_id VARCHAR(50) REFERENCES public.zones(id) ON DELETE CASCADE,
    group_id VARCHAR(10) REFERENCES public.ecg_groups(id) ON DELETE CASCADE,
    is_partial BOOLEAN DEFAULT FALSE NOT NULL,
    PRIMARY KEY (zone_id, group_id)
);

-- ==============================================================================
-- 2. PROFILS UTILISATEURS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(60) NOT NULL,
    zone_id VARCHAR(50) REFERENCES public.zones(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 3. SIGNALEMENTS & CALENDRIER OFFICIEL ECG
-- ==============================================================================

-- 3.1 Signalements citoyens temps réel (Matière première du crowdsourcing et du ML)
CREATE TABLE IF NOT EXISTS public.outage_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(50) NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('outage', 'restored', 'unstable')),
    description VARCHAR(280),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index pour requêtes rapides sur les 2 dernières heures
CREATE INDEX IF NOT EXISTS idx_outage_reports_zone_time 
    ON public.outage_reports(zone_id, created_at DESC);

-- 3.2 Horaires officiels ECG (Scrapés ou saisis)
CREATE TABLE IF NOT EXISTS public.ecg_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(50) NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    group_id VARCHAR(10) REFERENCES public.ecg_groups(id) ON DELETE SET NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    kind VARCHAR(20) DEFAULT 'planned' NOT NULL CHECK (kind IN ('planned', 'emergency')),
    source_url TEXT,
    source VARCHAR(20) DEFAULT 'script' NOT NULL CHECK (source IN ('manual', 'script')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT check_schedule_dates CHECK (ends_at > starts_at),
    CONSTRAINT uq_zone_schedule UNIQUE (zone_id, starts_at, ends_at)
);

CREATE INDEX IF NOT EXISTS idx_ecg_schedules_active 
    ON public.ecg_schedules(zone_id, starts_at, ends_at);

-- ==============================================================================
-- 4. VUE TEMPS RÉEL DU STATUT DES QUARTIERS (zone_status)
-- ==============================================================================

CREATE OR REPLACE VIEW public.zone_status AS
WITH recent_reports AS (
    SELECT 
        zone_id,
        COUNT(*) FILTER (WHERE kind = 'outage') AS outage_count,
        COUNT(*) FILTER (WHERE kind = 'restored') AS restored_count,
        COUNT(*) FILTER (WHERE kind = 'unstable') AS unstable_count,
        MAX(created_at) AS last_report_at
    FROM public.outage_reports
    WHERE created_at >= TIMEZONE('utc', NOW()) - INTERVAL '2 hours'
    GROUP BY zone_id
),
active_ecg AS (
    SELECT DISTINCT zone_id
    FROM public.ecg_schedules
    WHERE TIMEZONE('utc', NOW()) BETWEEN starts_at AND ends_at
)
SELECT 
    z.id AS zone_id,
    z.name AS zone_name,
    z.lat,
    z.lng,
    CASE
        WHEN COALESCE(r.outage_count, 0) >= 3 AND COALESCE(r.outage_count, 0) > COALESCE(r.restored_count, 0) THEN 'confirmed_outage'
        WHEN COALESCE(r.unstable_count, 0) >= 2 THEN 'unstable'
        WHEN COALESCE(r.outage_count, 0) > COALESCE(r.restored_count, 0) THEN 'probable_outage'
        ELSE 'powered'
    END AS status,
    COALESCE(r.outage_count, 0) + COALESCE(r.restored_count, 0) + COALESCE(r.unstable_count, 0) AS recent_reports_count,
    r.last_report_at,
    (a.zone_id IS NOT NULL) AS planned_now
FROM public.zones z
LEFT JOIN recent_reports r ON z.id = r.zone_id
LEFT JOIN active_ecg a ON z.id = a.zone_id;

-- ==============================================================================
-- 5. MOTEUR DE PRÉDICTION & MACHINE LEARNING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(50) NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    probability INT NOT NULL CHECK (probability BETWEEN 0 AND 100),
    confidence INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    expected_duration_min INT NOT NULL CHECK (expected_duration_min >= 0),
    hourly_risks JSONB NOT NULL DEFAULT '[]'::JSONB,
    method VARCHAR(30) NOT NULL CHECK (method IN ('rules', 'random_forest', 'xgboost', 'ensemble')),
    model_version VARCHAR(20) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_predictions_zone_latest 
    ON public.predictions(zone_id, generated_at DESC);

-- ==============================================================================
-- 6. SOLIDARITÉ ÉNERGÉTIQUE (OFFRES & DEMANDES)
-- ==============================================================================

-- 6.1 Offres d'énergie en surplus
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    zone_id VARCHAR(50) NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    source VARCHAR(20) NOT NULL CHECK (source IN ('solar', 'generator', 'battery')),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    capacity_label VARCHAR(100) NOT NULL,
    suggested_price_ghs NUMERIC(6,2) DEFAULT 0.00 NOT NULL CHECK (suggested_price_ghs >= 0),
    slots INT NOT NULL CHECK (slots > 0),
    available_until TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'suspended', 'depleted')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offers_zone_active 
    ON public.offers(zone_id, status);

-- 6.2 Réservations / Demandes de recharge
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_offer 
    ON public.bookings(offer_id, status);

-- ==============================================================================
-- 7. NOTIFICATIONS & PREFERENCES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    notify_outages BOOLEAN DEFAULT TRUE NOT NULL,
    notify_forecasts BOOLEAN DEFAULT TRUE NOT NULL,
    notify_offers BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 8. SÉCURITÉ & ANTI-SPAM (TRIGGER 5 SIGNALEMENTS / 10 MIN)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_count
    FROM public.outage_reports
    WHERE user_id = NEW.user_id
      AND created_at >= TIMEZONE('utc', NOW()) - INTERVAL '10 minutes';

    IF recent_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit dépassé : maximum 5 signalements en 10 minutes.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_report_rate_limit ON public.outage_reports;
CREATE TRIGGER trg_report_rate_limit
    BEFORE INSERT ON public.outage_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.check_report_rate_limit();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 9.1 Lecture publique
CREATE POLICY "Zones visibles par tous" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Groupes ECG visibles par tous" ON public.ecg_groups FOR SELECT USING (true);
CREATE POLICY "Liaisons groupes visibles par tous" ON public.zone_groups FOR SELECT USING (true);
CREATE POLICY "Signalements visibles par tous" ON public.outage_reports FOR SELECT USING (true);
CREATE POLICY "Horaires ECG visibles par tous" ON public.ecg_schedules FOR SELECT USING (true);
CREATE POLICY "Predictions visibles par tous" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Offres actives visibles par tous" ON public.offers FOR SELECT USING (status = 'active');

-- 9.2 Profils : lecture par tous, modification par le propriétaire
CREATE POLICY "Profils visibles par tous" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Modification profil propriétaire" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Creation profil propriétaire" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 9.3 Signalements : insertion sous son propre compte
CREATE POLICY "Insertion signalement connecté" ON public.outage_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9.4 Offres : gestion par l'hôte
CREATE POLICY "Gestion offre hote" ON public.offers FOR ALL USING (auth.uid() = host_id);

-- 9.5 Réservations : demandeur et hôte
CREATE POLICY "Lecture bookings concernes" ON public.bookings FOR SELECT 
    USING (auth.uid() = requester_id OR auth.uid() IN (SELECT host_id FROM public.offers WHERE id = offer_id));
CREATE POLICY "Creation booking demandeur" ON public.bookings FOR INSERT 
    WITH CHECK (auth.uid() = requester_id AND auth.uid() NOT IN (SELECT host_id FROM public.offers WHERE id = offer_id));
CREATE POLICY "Mise a jour booking hote ou demandeur" ON public.bookings FOR UPDATE 
    USING (auth.uid() = requester_id OR auth.uid() IN (SELECT host_id FROM public.offers WHERE id = offer_id));
