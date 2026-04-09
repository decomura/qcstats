-- QCStats – Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2026-04-09

-- =====================================================
-- 1. PROFILES (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'pl')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. MATCHES
-- =====================================================
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_name TEXT,
    match_type TEXT DEFAULT 'duel' CHECK (match_type IN ('duel')),
    player1_score INT NOT NULL DEFAULT 0,
    player2_score INT NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    screenshot_url TEXT,
    screenshot_url_2 TEXT,
    match_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. MATCH PLAYERS (2 rows per match)
-- =====================================================
CREATE TABLE public.match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    player_nick TEXT NOT NULL,
    side INT NOT NULL CHECK (side IN (1, 2)),
    score INT DEFAULT 0,
    ping INT DEFAULT 0,
    xp INT DEFAULT 0,
    total_damage INT DEFAULT 0,
    accuracy_pct INT DEFAULT 0,
    hits_shots TEXT, -- format: "364/1022"
    healing INT DEFAULT 0,
    mega_health_pickups INT DEFAULT 0,
    heavy_armor_pickups INT DEFAULT 0,
    light_armor_pickups INT DEFAULT 0,
    champion TEXT,
    is_winner BOOLEAN DEFAULT false,
    UNIQUE(match_id, side)
);

-- =====================================================
-- 4. WEAPON STATS (11 rows per match_player)
-- =====================================================
CREATE TABLE public.weapon_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_player_id UUID NOT NULL REFERENCES public.match_players(id) ON DELETE CASCADE,
    weapon_index INT NOT NULL CHECK (weapon_index BETWEEN 0 AND 10),
    weapon_name TEXT NOT NULL,
    hits_shots TEXT, -- format: "305/798"
    accuracy_pct INT DEFAULT 0,
    damage INT DEFAULT 0,
    kills INT DEFAULT 0,
    UNIQUE(match_player_id, weapon_index)
);

-- =====================================================
-- 5. FRIENDSHIPS
-- =====================================================
CREATE TABLE public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- =====================================================
-- 6. NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 7. REPORTS
-- =====================================================
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_match_players_match_id ON public.match_players(match_id);
CREATE INDEX idx_match_players_profile_id ON public.match_players(profile_id);
CREATE INDEX idx_match_players_player_nick ON public.match_players(player_nick);
CREATE INDEX idx_weapon_stats_match_player_id ON public.weapon_stats(match_player_id);
CREATE INDEX idx_matches_uploaded_by ON public.matches(uploaded_by);
CREATE INDEX idx_matches_match_date ON public.matches(match_date DESC);
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches are viewable by participants or public profiles"
    ON public.matches FOR SELECT
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.match_players mp
            WHERE mp.match_id = id AND mp.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.match_players mp
            JOIN public.profiles p ON mp.profile_id = p.id
            WHERE mp.match_id = id AND p.is_public = true
        )
    );

CREATE POLICY "Authenticated users can insert matches"
    ON public.matches FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Match uploader can update"
    ON public.matches FOR UPDATE
    USING (auth.uid() = uploaded_by);

-- Match Players
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match players viewable if match is viewable"
    ON public.match_players FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
        )
    );

CREATE POLICY "Authenticated users can insert match players"
    ON public.match_players FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id AND m.uploaded_by = auth.uid()
        )
    );

-- Weapon Stats
ALTER TABLE public.weapon_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weapon stats viewable if match player is viewable"
    ON public.weapon_stats FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.match_players mp
            WHERE mp.id = match_player_id
        )
    );

CREATE POLICY "Authenticated users can insert weapon stats"
    ON public.weapon_stats FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.match_players mp
            JOIN public.matches m ON mp.match_id = m.id
            WHERE mp.id = match_player_id AND m.uploaded_by = auth.uid()
        )
    );

-- Friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their received requests"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = friend_id);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
    ON public.reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

-- =====================================================
-- TRIGGER: Auto-create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'preferred_username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TRIGGER: Updated_at auto-update
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
