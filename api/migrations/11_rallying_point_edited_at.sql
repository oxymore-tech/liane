-- Date de la dernière création ou modification d'un point par un administrateur. La régénération ne touche
-- plus un point qui en porte une : ni mise à jour depuis la source, ni désactivation, ni réactivation.
ALTER TABLE rallying_point ADD COLUMN edited_at TIMESTAMPTZ;
