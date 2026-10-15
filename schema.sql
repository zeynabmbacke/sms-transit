-- Schéma de la base SMS (structure uniquement, aucune donnée)
-- Importer sur une base MySQL/MariaDB VIDE.
-- Reconstruit d'après le code du backend (dossiers.volume, numero_declaration, table factures).
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prenom` varchar(100) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `telephone` varchar(30) NOT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `dossiers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reference` varchar(30) NOT NULL,
  `client_id` int(11) NOT NULL,
  `type_operation` enum('transit') NOT NULL DEFAULT 'transit',
  `numero_conteneur` varchar(50) DEFAULT NULL,
  `type_conteneur` enum('20_pieds','40_pieds','frigorifique') DEFAULT NULL,
  `numero_bl` varchar(50) DEFAULT NULL,
  `compagnie_maritime` varchar(100) DEFAULT NULL,
  `port_origine` varchar(100) DEFAULT NULL,
  `port_destination` varchar(100) DEFAULT NULL,
  `nature_marchandise` varchar(255) DEFAULT NULL,
  `volume` varchar(50) DEFAULT NULL,
  `numero_declaration` varchar(100) DEFAULT NULL,
  `date_arrivee_prevue` date DEFAULT NULL,
  `date_arrivee_reelle` date DEFAULT NULL,
  `date_dedouanement` date DEFAULT NULL,
  `date_livraison` date DEFAULT NULL,
  `statut` enum('ouverture','en_traitement','pret','livre') NOT NULL DEFAULT 'ouverture',
  `montant_total_du` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `idx_dossiers_client` (`client_id`),
  KEY `idx_dossiers_statut` (`statut`),
  CONSTRAINT `dossiers_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `paiements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dossier_id` int(11) NOT NULL,
  `montant` decimal(12,2) NOT NULL,
  `date_versement` date NOT NULL,
  `mode_paiement` enum('especes','virement','mobile_money') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_paiements_dossier` (`dossier_id`),
  CONSTRAINT `paiements_ibfk_1` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `factures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dossier_id` int(11) NOT NULL,
  `nom_fichier` varchar(255) NOT NULL,
  `type_mime` varchar(100) NOT NULL,
  `contenu` longblob NOT NULL,
  `date_ajout` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_factures_dossier` (`dossier_id`),
  CONSTRAINT `factures_ibfk_1` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom_utilisateur` varchar(100) NOT NULL,
  `mot_de_passe_hash` varchar(255) NOT NULL,
  `role` enum('admin','agent') NOT NULL DEFAULT 'agent',
  `date_creation` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nom_utilisateur` (`nom_utilisateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS=1;