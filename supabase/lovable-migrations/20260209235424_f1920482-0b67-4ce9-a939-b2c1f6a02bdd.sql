
-- Create table for editable legal pages
CREATE TABLE public.legal_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  last_updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Everyone can read legal pages
CREATE POLICY "Anyone can read legal pages"
ON public.legal_pages
FOR SELECT
USING (true);

-- Only admins can update legal pages
CREATE POLICY "Admins can update legal pages"
ON public.legal_pages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert legal pages
CREATE POLICY "Admins can insert legal pages"
ON public.legal_pages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_legal_pages_updated_at
BEFORE UPDATE ON public.legal_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content
INSERT INTO public.legal_pages (slug, title, content) VALUES
('terms', 'Conditions Générales d''Utilisation', E'## 1. Acceptation des conditions\n\nEn accédant et en utilisant CollabCrea, vous acceptez d''être lié par ces Conditions Générales d''Utilisation. Si vous n''acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.\n\n## 2. Description du service\n\nCollabCrea est une plateforme de mise en relation entre créateurs de contenu et marques en Afrique. Notre service permet aux créateurs de présenter leur profil et aux marques de proposer des collaborations.\n\n## 3. Inscription et compte\n\nPour utiliser certaines fonctionnalités de CollabCrea, vous devez créer un compte. Vous êtes responsable de :\n- Fournir des informations exactes et à jour\n- Maintenir la confidentialité de vos identifiants de connexion\n- Toutes les activités effectuées sous votre compte\n\n## 4. Utilisation acceptable\n\nVous vous engagez à ne pas :\n- Utiliser la plateforme à des fins illégales\n- Publier du contenu faux, trompeur ou diffamatoire\n- Harceler ou intimider d''autres utilisateurs\n- Tenter de compromettre la sécurité de la plateforme\n- Créer plusieurs comptes ou usurper l''identité d''autrui\n\n## 5. Propriété intellectuelle\n\nVous conservez tous les droits sur le contenu que vous publiez. En publiant du contenu sur CollabCrea, vous nous accordez une licence non exclusive pour afficher ce contenu sur la plateforme.\n\n## 6. Intégrations tierces\n\nCollabCrea peut se connecter à des services tiers (TikTok, YouTube, Instagram, etc.) pour vérifier vos statistiques. Ces connexions sont soumises aux conditions d''utilisation de ces services respectifs.\n\n## 7. Limitation de responsabilité\n\nCollabCrea agit uniquement comme intermédiaire. Nous ne sommes pas responsables des accords conclus entre créateurs et marques, ni des litiges pouvant en découler.\n\n## 8. Modifications\n\nNous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication sur cette page.\n\n## 9. Contact\n\nPour toute question concernant ces conditions, veuillez nous contacter via la page Contact.'),
('privacy', 'Politique de Confidentialité', E'## 1. Introduction\n\nChez CollabCrea, nous prenons la protection de vos données personnelles très au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.\n\n## 2. Données collectées\n\nNous collectons les types de données suivants :\n- **Informations de compte :** nom, email, numéro de téléphone, pays\n- **Informations de profil :** photo, biographie, catégorie, tarifs\n- **Données des réseaux sociaux :** nombre d''abonnés (via OAuth avec votre consentement)\n- **Documents d''identité :** pour la vérification des créateurs\n- **Données d''utilisation :** interactions avec la plateforme\n\n## 3. Utilisation des données\n\nVos données sont utilisées pour :\n- Fournir et améliorer nos services\n- Vérifier l''authenticité des profils créateurs\n- Faciliter les mises en relation avec les marques\n- Communiquer avec vous concernant votre compte\n- Assurer la sécurité de la plateforme\n\n## 4. Intégrations tierces\n\nLorsque vous connectez vos comptes TikTok, YouTube ou autres réseaux sociaux, nous accédons uniquement aux statistiques publiques (nombre d''abonnés) nécessaires pour vérifier votre profil. Nous ne publions jamais en votre nom et ne stockons pas vos identifiants de connexion.\n\n## 5. Partage des données\n\nNous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations avec :\n- Les marques avec lesquelles vous choisissez de collaborer\n- Nos prestataires techniques (hébergement, analyse)\n- Les autorités si requis par la loi\n\n## 6. Sécurité\n\nNous utilisons des mesures de sécurité conformes aux standards de l''industrie pour protéger vos données, incluant le chiffrement, l''authentification sécurisée et des audits réguliers.\n\n## 7. Vos droits\n\nConformément aux lois applicables, vous avez le droit de :\n- Accéder à vos données personnelles\n- Rectifier vos informations\n- Supprimer votre compte et vos données\n- Retirer votre consentement aux intégrations tierces\n- Exporter vos données\n\n## 8. Conservation des données\n\nNous conservons vos données tant que votre compte est actif. Après suppression de votre compte, vos données sont effacées dans un délai de 30 jours, sauf obligation légale de conservation.\n\n## 9. Cookies\n\nNous utilisons des cookies essentiels pour le fonctionnement de la plateforme et des cookies d''analyse pour améliorer nos services. Vous pouvez gérer vos préférences dans les paramètres de votre navigateur.\n\n## 10. Contact\n\nPour exercer vos droits ou poser des questions sur cette politique, contactez-nous via la page Contact.');
