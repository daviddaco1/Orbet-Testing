-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 24-01-2025 a las 17:54:56
-- Versión del servidor: 9.1.0
-- Versión de PHP: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `orbetdb`
--

DELIMITER $$
--
-- Procedimientos
--
DROP PROCEDURE IF EXISTS `getUserDataJSON`$$
CREATE DEFINER=`danieldev`@`%` PROCEDURE `getUserDataJSON` (IN `userId` INT)   BEGIN
    SELECT JSON_OBJECT(
        'userInfo', (SELECT JSON_OBJECT(
                        'fullName', ui.full_name,
                        'currentCountry', ui.current_sign_in_country,
                        'signInAt', ui.current_sign_in_at,
                        'signInIp', ui.current_sign_in_ip,
                        'createdAt', ui.created_at,
                        'createdIn', ui.created_in_country,
                        'confirmedAt', ui.confirmed_at,
                        'twoFactorAuth', ui.two_factor_auth_enabled,
                        'termsAcceptedAt', ui.terms_accepted_at,
                        'status', u.status
                     )
                     FROM user_info ui WHERE ui.user_id = u.user_id),
        'userExtraInfo', (SELECT JSON_OBJECT(
                            'app', uei.app,
                            'person', uei.person,
                            'customerio', uei.customerio,
                            'googleAnalytics', uei.google_analytics,
                            'lastTrackedCountry', uei.last_tracked_country,
                            'lastTrackedCountryRegion', uei.last_tracked_country_region,
                            'pspTrustedLevel', uei.psp_trusted_level
                          )
                          FROM user_extra_info uei WHERE uei.user_id = u.user_id),
        'userAdArgsInfo', (SELECT JSON_OBJECT(
                            'ga', ua.ga,
                            'utmSource', ua.utm_source,
                            'utmMedium', ua.utm_medium,
                            'utmCampaign', ua.utm_campaign,
                            'utmContent', ua.utm_content,
                            'utmTerm', ua.utm_term,
                            'stagAffiliate', ua.stag_affiliate,
                            'stagVisit', ua.stag_visit,
                            'btag', ua.btag,
                            'btagNetRefer', ua.btag_net_refer,
                            'qtag', ua.qtag,
                            'refCode', ua.ref_code
                          )
                          FROM user_ad_args ua WHERE ua.user_id = u.user_id),
        'userDetailsInfo', (SELECT JSON_OBJECT(
                            'personalIdNumber', ud.personal_id_number,
                            'firstName', ud.first_name,
                            'lastName', ud.last_name,
                            'nickname', ud.nickname,
                            'dateOfBirth', ud.date_of_birth,
                            'gender', ud.gender,
                            'country', u.country,
                            'city', ud.city,
                            'address', ud.address,
                            'postalCode', ud.postal_code,
                            'receiveEmailPromos', ud.receive_email_promos,
                            'receiveSmsPromos', ud.receive_sms_promos,
                            'securityQuestion', ud.security_question,
                            'securityAnswer', ud.security_answer,
                            'state', ud.state,
                            'mobilePhone', ud.mobile_phone
                          )
                          FROM user_details ud WHERE ud.user_id = u.user_id),
        'phoneInfo', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'number', uph.phone_number,
                            'status', uph.status,
                            'verification', uph.verified,
                            'country', uph.country,
                            'type', uph.phone_type
                        )
                      ) 
                      FROM user_phones uph WHERE uph.user_id = u.user_id),
        'usedAddresses', (SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'currency', uua.currency,
                                'address', uua.crypto_address
                            )
                          )
                          FROM user_used_addresses uua WHERE uua.user_id = u.user_id),
        'usedIPs', (SELECT JSON_ARRAYAGG(
                        uip.ip_address
                    )
                    FROM user_ips uip WHERE uip.user_id = u.user_id),
        'netTotal', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'currency', unt.currency,
                            'totalBets', unt.total_bets,
                            'totalWins', unt.total_wins,
                            'bonuses', unt.bonuses,
                            'netTotal', unt.net_total,
                            'payout', unt.payout_percentage
                        )
                    )
                    FROM user_net_total unt WHERE unt.user_id = u.user_id),
        'accounts', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', ua.account_id,
                            'currency', ua.currency,
                            'balance', ua.balance,
                            'depositSum', ua.deposit_sum,
                            'cashoutsSum', ua.cashouts_sum,
                            'pendingCashoutsSum', ua.pending_cashouts_sum,
                            'chargebacksSum', ua.chargebacks_sum,
                            'unreceivedDepositsSum', ua.unreceived_deposits_sum,
                            'refundsSum', ua.refunds_sum,
                            'reversalsSum', ua.reversals_sum,
                            'affiliatePaymentsSum', ua.affiliate_payments_sum,
                            'avgBet', ua.avg_bet,
                            'giftsSum', ua.gifts_sum,
                            'spentInCasino', ua.spent_in_casino,
                            'bonuses', ua.bonuses,
                            'bonusRatio', ua.bonus_ratio
                        )
                      )
                      FROM user_accounts ua WHERE ua.user_id = u.user_id),
        'latestPayments', (SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'action', ulp.action,
                                'source', ulp.source,
                                'account', ulp.account,
                                'sourceOfApproval', ulp.source_of_approval,
                                'manual', ulp.manual,
                                'returnType', ulp.return_type,
                                'comments', ulp.comments,
                                'sumsubPmv', ulp.sumsub_pmv,
                                'success', ulp.success,
                                'createdAt', ulp.created_at,
                                'finishedAt', ulp.finished_at,
                                'amount', ulp.amount,
                                'currency', ulp.currency,
                                'relatedAccountId', ulp.user_id
                            )
                          )
                          FROM user_latest_payments ulp WHERE ulp.user_id = u.user_id),
        'binInfo', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'currency', ubi.currency,
                            'system', ubi.payment_system,
                            'account', ubi.account,
                            'bankName', ubi.bank_name,
                            'bankCountry', ubi.bank_country,
                            'stage', ubi.stage,
                            'cardType', ubi.card_type,
                            'relatedAccountId', ubi.user_id
                        )
                    )
                    FROM user_bin_info ubi WHERE ubi.user_id = u.user_id),
        'paymentSystemsDebts', (SELECT JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'createdAt', upsd.created_at,
                                        'updatedAt', upsd.updated_at,
                                        'systemName', upsd.system_name,
                                        'accountInSystem', upsd.account_in_system,
                                        'paymentAccount', upsd.payment_account,
                                        'currency', upsd.currency,
                                        'debit', upsd.debit,
                                        'verified', upsd.verified,
                                        'relatedAccountId', upsd.user_id
                                    )
                                )
                                FROM user_payment_system_debts upsd WHERE upsd.user_id = u.user_id),
        'documents', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', udc.document_id,
                            'url', udc.file_path,
                            'type', udc.type,
                            'description', udc.description,
                            'createdAt', udc.created_at,
                            'updatedAt', udc.updated_at,
                            'status', udc.status,
                            'isApproved', udc.is_approved
                        )
                    )
                    FROM user_documents udc WHERE udc.user_id = u.user_id),
        'comments', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'adminEmail', uc.admin_email,
                            'date', uc.created_at,
                            'comment', uc.comment_text
                        )
                    )
                    FROM user_comments uc WHERE uc.user_id = u.user_id),
        'locks', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'reason', ul.type,
                            'comment', ul.comment,
                            'type', CASE
                                        WHEN ul.type = 'Cs reason' THEN 'csLocks'
                                        WHEN ul.type = 'Sb reason' THEN 'sbLocks'
                                    END
                        )
                    )
                    FROM user_locks ul WHERE ul.user_id = u.user_id),
        'latestEvents', (SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'date', us.event_date,
                                'eventType', us.event_type,
                                'ip', us.ip,
                                'country', us.country,
                                'address', us.address,
                                'coordinates', us.coordinates
                            )
                          )
                          FROM user_sessions us WHERE us.user_id = u.user_id),
        'tags', (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'tag_id', ut.tag_id,
                        'tag_name', utl.tag_name
                    )
                  )
                  FROM user_tags ut
                  LEFT JOIN user_tags_list utl ON ut.tag_id = utl.tag_id
                  WHERE ut.user_id = u.user_id),
        'groups', (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'group_id', ug.group_id,
                        'group_name', ugl.group_name
                    )
                  )
                  FROM user_groups ug
                  LEFT JOIN user_groups_list ugl ON ug.group_id = ugl.group_id
                  WHERE ug.user_id = u.user_id),
        'bonuses', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'issuedAt', b.issued_at,
                            'bonusName', b.bonus,
                            'amount', b.amount,
                            'strategy', b.strategy,
                            'stage', b.stage,
                            'amountLocked', b.amount_locked,
                            'wager', b.wager,
                            'expiryDate', b.expiry_date,
                            'relatedAccountId', b.related_account_id
                        )
                    )
                    FROM user_issued_bonuses b WHERE b.user_id = u.user_id),
'Emptybonuses', (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', b.id,
                            'user_id', b.user_id,
                            'issued_at', b.issued_at
                        )
                    )
                    FROM user_issued_empty_bonuses b WHERE b.user_id = u.user_id)
    )
    INTO @result
    FROM users u
    WHERE u.user_id = userId;

    SELECT @result AS jsonResult;
END$$

DROP PROCEDURE IF EXISTS `getUserListNBalance`$$
CREATE DEFINER=`danieldev`@`%` PROCEDURE `getUserListNBalance` ()   BEGIN
    SELECT 
        u.*, -- Selecciona todas las columnas de la tabla users
        ub.balance, -- Selecciona la columna balance de user_balances
        ub.currency -- Selecciona la columna currency de user_balances
    FROM users u
    LEFT JOIN user_balances ub ON u.user_id = ub.user_id;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admins`
--

DROP TABLE IF EXISTS `admins`;
CREATE TABLE IF NOT EXISTS `admins` (
  `admin_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT '0',
  `current_sign_in_at` datetime DEFAULT NULL,
  `last_sign_in_at` datetime DEFAULT NULL,
  `sign_in_count` int DEFAULT '0',
  `disabled` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `admins`
--

INSERT INTO `admins` (`admin_id`, `name`, `email`, `password_hash`, `role_id`, `two_factor_enabled`, `current_sign_in_at`, `last_sign_in_at`, `sign_in_count`, `disabled`, `created_at`, `updated_at`) VALUES
(1, 'Master', 'admin@orbet.com', '$2b$12$TArrE0B6VSsSBmKi3HKIXe8puOlI2RPXU16ygOnkA/fzLgaZLbLY2', 1, 0, NULL, NULL, 0, 0, '2025-01-09 15:50:57', '2025-01-17 17:42:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `adminskeys`
--

DROP TABLE IF EXISTS `adminskeys`;
CREATE TABLE IF NOT EXISTS `adminskeys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin` int NOT NULL,
  `hash` varchar(256) NOT NULL,
  `expiry` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admins_sessions`
--

DROP TABLE IF EXISTS `admins_sessions`;
CREATE TABLE IF NOT EXISTS `admins_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `hash` varchar(128) DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `device` varchar(100) DEFAULT NULL,
  `login_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admin_activity_logs`
--

DROP TABLE IF EXISTS `admin_activity_logs`;
CREATE TABLE IF NOT EXISTS `admin_activity_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(256) NOT NULL,
  `dateEvent` varchar(64) NOT NULL,
  `userAffected` int NOT NULL DEFAULT '-1',
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `admin_activity_logs`
--

INSERT INTO `admin_activity_logs` (`log_id`, `user_id`, `action`, `dateEvent`, `userAffected`) VALUES
(1, 1, 'Dio click en el boton 1', '2024-10-10 16:52:02', -1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admin_roles`
--

DROP TABLE IF EXISTS `admin_roles`;
CREATE TABLE IF NOT EXISTS `admin_roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `admin_roles`
--

INSERT INTO `admin_roles` (`role_id`, `role_name`, `permissions`, `created_at`, `updated_at`) VALUES
(1, 'b5aa7ff17377f1a538e30521587fc159:eb2eaf61c45fe311beeaa0dd004e2674', 'a558020dfb9c9334d5c7b091860521cb:fc6d465638eaacb01c4aa6ac4ffa22e02aa5c01d828d3b26f323dd4f9d12d63c19d3f5afdae453cd0030d225d1a8ed606ba44a829c74fd77c7796025ae238d84', '2025-01-09 16:03:36', '2025-01-09 16:04:07');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `affiliate_links`
--

DROP TABLE IF EXISTS `affiliate_links`;
CREATE TABLE IF NOT EXISTS `affiliate_links` (
  `link_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `affiliate_id` int NOT NULL,
  `linked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','inactive') DEFAULT 'active',
  PRIMARY KEY (`link_id`),
  UNIQUE KEY `unique_user_affiliate` (`user_id`,`affiliate_id`),
  KEY `affiliate_id` (`affiliate_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `affiliate_links`
--

INSERT INTO `affiliate_links` (`link_id`, `user_id`, `affiliate_id`, `linked_at`, `status`) VALUES
(1, 1, 14, '2024-02-25 01:01:24', 'active'),
(2, 10, 15, '2024-11-04 01:01:24', 'inactive'),
(3, 3, 17, '2024-02-15 01:01:24', 'active'),
(4, 4, 15, '2024-07-31 01:01:24', 'active'),
(5, 2, 16, '2024-07-02 01:01:24', 'active');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `affiliate_statistics`
--

DROP TABLE IF EXISTS `affiliate_statistics`;
CREATE TABLE IF NOT EXISTS `affiliate_statistics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `campaign_id` int NOT NULL,
  `total_referrals` int DEFAULT '0',
  `total_wagered` decimal(18,2) DEFAULT '0.00',
  `total_earnings` decimal(18,2) DEFAULT '0.00',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_affiliate` (`user_id`,`campaign_id`),
  KEY `campaign_id` (`campaign_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `affiliate_statistics`
--

INSERT INTO `affiliate_statistics` (`id`, `user_id`, `campaign_id`, `total_referrals`, `total_wagered`, `total_earnings`, `last_updated`, `created_at`) VALUES
(1, 1, 6, 15, 3535.22, 185.20, '2025-01-16 19:45:48', '2024-06-16 00:43:07'),
(2, 2, 9, 47, 1630.96, 110.09, '2025-01-16 19:45:52', '2024-11-06 00:43:07'),
(3, 3, 2, 79, 5214.30, 941.54, '2025-01-16 19:45:56', '2025-01-04 00:43:07'),
(4, 4, 8, 71, 4500.85, 586.33, '2025-01-16 19:45:59', '2024-07-15 00:43:07'),
(5, 5, 10, 7, 2687.93, 174.32, '2025-01-16 19:46:04', '2024-02-29 00:43:07'),
(6, 1, 2, 15, 50.00, 10.00, '2025-01-19 00:08:42', '2025-01-16 19:47:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `api_keys`
--

DROP TABLE IF EXISTS `api_keys`;
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `api_key` varchar(64) NOT NULL,
  `Name` varchar(52) DEFAULT NULL,
  `allowed_endpoints` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_key` (`api_key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `api_keys`
--

INSERT INTO `api_keys` (`id`, `api_key`, `Name`, `allowed_endpoints`, `created_at`, `expires_at`, `is_active`) VALUES
(2, '$2a$12$oYYT763uPsYLZoFvXOw1YeFUHJNA1AqdEI9AChEe0b0KMnA8RX526', 'Master', '[\"*\"]', '2024-11-18 16:43:27', '2025-12-31 11:37:18', 1),
(4, '$2a$12$wAIcUfOYnYIZH2/jm4vyJ.NAM6phSgdFU1yRvpilan10x4rGQtdfu', 'Testing', '[\"/secure-endpoint\", \"/player-info\", \"/update-user-tags\", \"/update-user-groups\", \"/update-user-ip\", \"/update-user-addresses\", \"/user-phones\", \"/user-phones/verify\", \"/duplications\", \"/documents\", \"/save-sensitive-data\", \"/get-sensitive-data\", \"/terms\", \"/terms/consent\", \"/terms/consents\", \"/terms/active\", \"/terms/consents/version\", \"/user/change-password\", \"/backend_preferences\"]', '2024-11-18 16:43:27', '2025-12-31 11:37:18', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `archived_user_sessions`
--

DROP TABLE IF EXISTS `archived_user_sessions`;
CREATE TABLE IF NOT EXISTS `archived_user_sessions` (
  `archived_session_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `event_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `event_type` enum('User signed in','User sign out','User used new ip') DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `coordinates` point DEFAULT NULL,
  `status` enum('active','inactive','terminated') DEFAULT 'inactive',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`archived_session_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `archived_user_sessions`
--

INSERT INTO `archived_user_sessions` (`archived_session_id`, `session_id`, `user_id`, `event_date`, `event_type`, `ip`, `country`, `address`, `coordinates`, `status`, `created_at`, `updated_at`, `token`) VALUES
(1, 2, 1, '2024-10-08 14:45:08', 'User sign out', '127.0.0.1', 'Canada', 'Edmonton, T5Y Alberta Canada', 0x000000000101000000a4703d0ad7d34a409c33a2b437585cc0, 'inactive', '2025-01-15 16:25:08', '2025-01-15 16:25:08', NULL),
(2, 7, 2, '2024-01-15 08:05:00', 'User signed in', '203.0.113.5', 'Russia', 'Moscow', 0x0000000001010000008d28ed0dbee04b4010e9b7af03cf4240, 'terminated', '2025-01-16 04:15:20', '2025-01-16 04:48:20', 'token_risk101'),
(3, 1, 1, '2024-10-04 12:11:40', 'User signed in', '127.0.0.1', 'Canada', 'Edmonton, T5Y Alberta Canada', 0x000000000101000000a4703d0ad7d34a409c33a2b437585cc0, 'terminated', '2025-01-15 16:25:08', '2025-01-16 16:35:40', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `affected_table` varchar(100) NOT NULL,
  `log_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `details` text,
  PRIMARY KEY (`log_id`),
  KEY `admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `backend_preferences`
--

DROP TABLE IF EXISTS `backend_preferences`;
CREATE TABLE IF NOT EXISTS `backend_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `preference_key` varchar(255) NOT NULL,
  `preference_value` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_preference` (`preference_key`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `backend_preferences`
--

INSERT INTO `backend_preferences` (`id`, `preference_key`, `preference_value`, `created_at`, `updated_at`) VALUES
(54, 'theme', 'dark', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(55, 'language', 'en', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(56, 'default_currency', 'USD', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(57, 'notifications_enabled', 'true', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(58, 'notification_sound', 'on', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(59, 'transaction_limit', '5000', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(60, 'email_notifications', 'true', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(61, 'sms_notifications', 'false', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(62, 'timezone', 'America/New_York', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(63, 'show_balance', 'true', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(64, 'auto_logout_time', '15', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(65, 'marketing_emails', 'true', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(66, 'two_factor_auth', 'true', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(67, 'profile_visibility', 'public', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(68, 'betting_preferences', 'sports', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(69, 'preferred_payment_method', 'credit_card', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(70, 'avatar_url', 'https://example.com/avatar.jpg', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(71, 'dashboard_layout', 'grid', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(72, 'bet_limit', '1000', '2025-01-08 15:51:37', '2025-01-08 15:51:37'),
(73, 'favorite_sports', 'soccer', '2025-01-08 15:51:37', '2025-01-08 15:51:37');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `base_rakeback_config`
--

DROP TABLE IF EXISTS `base_rakeback_config`;
CREATE TABLE IF NOT EXISTS `base_rakeback_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `claim_cooldown_minutes` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `battle_pass_config`
--

DROP TABLE IF EXISTS `battle_pass_config`;
CREATE TABLE IF NOT EXISTS `battle_pass_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `level` int NOT NULL,
  `wager` bigint NOT NULL,
  `wager_difference` bigint NOT NULL,
  `cash_prizes` decimal(10,2) NOT NULL,
  `rakeback_bonus` decimal(10,2) NOT NULL,
  `free_spins` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bets`
--

DROP TABLE IF EXISTS `bets`;
CREATE TABLE IF NOT EXISTS `bets` (
  `bet_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `game` varchar(50) NOT NULL,
  `result` enum('win','lose','draw') NOT NULL,
  `payout` decimal(10,2) DEFAULT '0.00',
  `bet_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('completed','pending') DEFAULT 'pending',
  PRIMARY KEY (`bet_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bonus_config`
--

DROP TABLE IF EXISTS `bonus_config`;
CREATE TABLE IF NOT EXISTS `bonus_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_name` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `bonus_config`
--

INSERT INTO `bonus_config` (`id`, `bonus_name`, `created_at`, `updated_at`) VALUES
(1, 'Base Rakeback', '2025-01-14 10:16:51', '2025-01-14 10:16:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bonus_logs`
--

DROP TABLE IF EXISTS `bonus_logs`;
CREATE TABLE IF NOT EXISTS `bonus_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bonus_type` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calendar_bonus_config`
--

DROP TABLE IF EXISTS `calendar_bonus_config`;
CREATE TABLE IF NOT EXISTS `calendar_bonus_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `distribution_days` int NOT NULL,
  `morning_split` decimal(5,2) NOT NULL,
  `afternoon_split` decimal(5,2) NOT NULL,
  `evening_split` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calendar_bonus_schedule`
--

DROP TABLE IF EXISTS `calendar_bonus_schedule`;
CREATE TABLE IF NOT EXISTS `calendar_bonus_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bonus_type` varchar(50) NOT NULL,
  `day` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `scheduled_date` date NOT NULL,
  `claimed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`bonus_type`,`day`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
CREATE TABLE IF NOT EXISTS `campaigns` (
  `campaign_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `status` enum('active','inactive','completed') DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`campaign_id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_campaign_status` (`status`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `campaigns`
--

INSERT INTO `campaigns` (`campaign_id`, `name`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Summer Blast', '2024-06-01 00:00:00', '2024-08-31 00:00:00', 'active', '2025-01-16 14:54:24', '2025-01-16 14:54:24'),
(2, 'Winter Wonders', '2024-12-01 00:00:00', '2025-02-28 00:00:00', 'inactive', '2025-01-16 14:54:24', '2025-01-16 14:54:24'),
(3, 'Spring Savings', '2024-03-01 00:00:00', '2024-05-31 00:00:00', 'completed', '2025-01-16 14:54:24', '2025-01-16 14:54:24');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `challenges`
--

DROP TABLE IF EXISTS `challenges`;
CREATE TABLE IF NOT EXISTS `challenges` (
  `challenge_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `objective` text NOT NULL,
  `reward_type` enum('points','coins','bonus','item') NOT NULL,
  `reward_value` decimal(10,2) NOT NULL,
  `start_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`challenge_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `challenges`
--

INSERT INTO `challenges` (`challenge_id`, `name`, `description`, `objective`, `reward_type`, `reward_value`, `start_date`, `end_date`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Weekly Deposit Challenge', 'Depósito acumulado de $500 en una semana', 'Deposit $500 within a week', 'bonus', 50.00, '2024-12-26 22:56:15', '2025-01-02 22:56:15', 1, '2024-12-26 22:56:15', '2025-01-02 15:28:58'),
(2, 'Slot Master', 'Realiza 100 giros en máquinas tragamonedas', 'Spin 100 times on slot machines', 'coins', 100.00, '2024-12-26 22:56:15', NULL, 1, '2024-12-26 22:56:15', '2025-01-02 15:28:58'),
(3, 'High Roller', 'Apuesta $1000 en cualquier juego', 'Bet $1000 in any game', 'points', 500.00, '2024-12-26 22:56:15', NULL, 1, '2024-12-26 22:56:15', '2025-01-02 15:28:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `content` text NOT NULL,
  `sent_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `sender_id` (`sender_id`),
  KEY `recipient_id` (`recipient_id`)
) ENGINE=MyISAM AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `chat_messages`
--

INSERT INTO `chat_messages` (`message_id`, `sender_id`, `recipient_id`, `content`, `sent_at`) VALUES
(21, 22, 21, '49891b876e8c3fe1086fd052d09ec454:5f63e84b2f06e06d3bfbdae3a057139a9f65a29b8c515242ba4d474818735b3a', '2025-01-23 18:39:34'),
(28, 22, 21, 'b4cbf5dfe60ef7266e5c7e8b0dbc003f:f981a6c9b2d83e655116ae7b615ca177929a307987deae13b32f060cd0e43298', '2025-01-23 18:43:32'),
(27, 22, 21, '1a986dfc12c85864937bea34c6e3382f:d95432fac5a01676a7bf28f96bd47a13e0e8cd72ba36e51497c3742daedadf05', '2025-01-23 18:43:32'),
(26, 22, 21, '587d6f17c402a3c33d3439502f3e858a:18e8d89b1050172675529653128976533b1ab2925b7eda1da77744e5d094e5a4', '2025-01-23 18:43:31'),
(25, 22, 21, '32319f16cf0ac63fb137bc0243283f08:10e26a6867cd0b6743fc60dd227c33b142d6c3f7d63a19e39cd029c5dad367a6', '2025-01-23 18:43:31'),
(24, 22, 21, 'dca49f1fc784879820ba0fd4a2f6d80c:fcda1fd7b8e1a9185c5b4337d1750145699a3d52cab9ec3d4a46ebebbf8faea5', '2025-01-23 18:43:30'),
(23, 22, 21, 'ff3f72bd035a567a45adcd4038b32747:03c1c1fb82b1d18b5c767a794b7bea744d97fad3c59e0b4426e66a81048c9986', '2025-01-23 18:43:29'),
(22, 21, 22, 'd0c79deb9fff5c8692be6137346277aa:a32d4b4834b16ad0661d7e9afa6a679fc787eb6bcce0ef95e37de01713c19b4b', '2025-01-23 18:39:38'),
(29, 22, 21, 'e0f3ec57f64b8ac9390e8f79c97196e1:d097fad592d56a96d5f526ff8c8c3127ed98618c1d12857c48ae25f478a0bcba', '2025-01-23 18:43:32'),
(30, 22, 21, '9f3ba03f2826bcd8af1dc5397cbaa754:bdcbf1af0cb092dcb97e3a52afe66cd288dd489c2d6b7ba62fc03e4b2082dc73', '2025-01-23 18:43:33'),
(31, 22, 21, 'd4ac415d8f91ffb783fd0588b595063c:9f175f3b22974c8fe9e8a5a6463d8eb671fd6fdecea2ab87a96a1aa91ea77053', '2025-01-23 18:43:33'),
(32, 22, 21, '818e817858aaab708775bf5747a10d04:7d1c289c8dbaa8753b2aa0e291fe76ee507d8014b4d1bcdb79e9fa73fb05255d', '2025-01-23 18:43:33'),
(33, 21, 22, '14894c7c21d64ae3977af5a97460e817:4fd69978b5449d1f945b317dd7b1a044a1b0953b49df8d9326337876b41511d0', '2025-01-23 18:57:47'),
(34, 21, 22, '5540c4e8b632f483f68f8056fc159fee:f2176eeb29bad6999b5e9eea7f5a5deae1690b7332a0645de274d3388b878fcf33f1b6bd781a3ab28ef902b7977da9a4', '2025-01-23 18:57:56'),
(35, 21, 22, '454dcdd06dbce956950e0c10f2ed1665:5827fbd6f4bdfd33340d33ffbfd1c6b26e96b0db9acd82f595f05fd79d87ca9987c88847387dea9eea7fe212d80336da', '2025-01-23 18:58:00'),
(36, 21, 22, '0332283c91401cf354804a29778fb3d5:1515b950dfacc52bfdb40209074ad2785a8f52b16a97519d56cda7e32cd076ba4accdbf3e36949c57dd065149c427270', '2025-01-23 18:58:02'),
(37, 21, 22, 'e80aac2a7b488cd9d717c5505cf7cf01:d9b29b7a7ad1b5d185df890f0829e26f09911c53b8211dc34d6e28ec7d271e3a15aa4cb03b2f89eec0b9467bf370f482', '2025-01-23 18:58:05'),
(38, 21, 22, '2ae2c0e4c44b47e7c0162896afbcfe9f:4ec8f83882e6592367d478d08600a9ce7c6abf0f8af261fdc0fe4eb0b3e3fb85358b5eff7553a36f02f5f546b1eae63f', '2025-01-23 18:58:09'),
(39, 21, 22, 'e765d99d3fb310eb626b699499d1b182:50912605f9df5d10332f7623e94a3e92b72d5435a7a586c5d4fb6ee25045a84606eeec8c50b7d9d582dcc9791ba61489', '2025-01-23 18:58:11'),
(40, 21, 22, '116a5b1110f55bf1d617ee9bfa4835dd:f9d46210115c8fe5d2dcb3d4e1c17d83652cfe725db24877d1e888652a0b0ed4b01d15bc5387f8e20da488eb5e254b99', '2025-01-23 18:58:13'),
(41, 21, 22, 'cfe811d82c1d33a33e4bb724b410d254:2c8426092d0a72c62911113e3df1ff8d2ddc446c6d02c888c63c94cd2dcc16ea8f0f700ccc9158ac607d7176e45b855f', '2025-01-23 18:58:16'),
(42, 22, 21, '3378fd3d798119c679eff661932c2c1b:365e8cac2050c5d19b5a4dc4ae7b90fc86e97a8fb2761c810e08a9f3ddeb2d29', '2025-01-24 12:43:57');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_risk_events`
--

DROP TABLE IF EXISTS `chat_risk_events`;
CREATE TABLE IF NOT EXISTS `chat_risk_events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `event_type` varchar(50) DEFAULT NULL,
  `description` text,
  `detected_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `chat_risk_events`
--

INSERT INTO `chat_risk_events` (`event_id`, `user_id`, `event_type`, `description`, `detected_at`) VALUES
(1, 21, 'repeated_message', 'User sent repeated messages', '2025-01-23 18:57:48'),
(2, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:00:52'),
(3, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:02'),
(4, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:03'),
(5, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:04'),
(6, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:04'),
(7, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:05'),
(8, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:06'),
(9, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:06'),
(10, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:07'),
(11, 21, 'prohibited_content', 'Message contains prohibited words: badword1', '2025-01-23 19:01:08'),
(12, 21, 'rate_limit', 'User is sending many messages in a short time', '2025-01-23 19:01:08'),
(13, 21, 'rate_limit', 'User is sending many messages in a short time', '2025-01-23 19:01:08');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `daily_bonus_config`
--

DROP TABLE IF EXISTS `daily_bonus_config`;
CREATE TABLE IF NOT EXISTS `daily_bonus_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `max_accumulation_days` int NOT NULL,
  `immediate_claim_percentage` decimal(5,2) DEFAULT NULL,
  `calendar_claim_percentage` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `duplicity_reasons`
--

DROP TABLE IF EXISTS `duplicity_reasons`;
CREATE TABLE IF NOT EXISTS `duplicity_reasons` (
  `reason_uuid` char(36) NOT NULL,
  `reason_description` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reason_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `duplicity_reasons`
--

INSERT INTO `duplicity_reasons` (`reason_uuid`, `reason_description`, `created_at`) VALUES
('1', 'Fraudulent activity detected', '2024-12-12 16:13:31'),
('2', 'Multiple accounts with matching IP', '2024-12-12 16:13:31'),
('3', 'Abuse of bonus system', '2024-12-12 16:13:31'),
('4', 'Linked by matching payment methods', '2024-12-12 16:13:31'),
('5', 'User requested account merge', '2024-12-12 16:13:31'),
('6', 'Suspicious registration patterns', '2024-12-12 16:13:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `email_marketing_logs`
--

DROP TABLE IF EXISTS `email_marketing_logs`;
CREATE TABLE IF NOT EXISTS `email_marketing_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `campaign_id` int NOT NULL,
  `action` enum('subscribed','unsubscribed') NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  KEY `campaign_id` (`campaign_id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `email_marketing_logs`
--

INSERT INTO `email_marketing_logs` (`log_id`, `user_id`, `campaign_id`, `action`, `timestamp`) VALUES
(1, 1, 1, 'subscribed', '2025-01-21 10:11:03'),
(2, 1, 1, 'unsubscribed', '2025-01-21 10:11:25'),
(3, 1, 1, 'subscribed', '2025-01-21 10:12:33'),
(4, 1, 2, 'subscribed', '2025-01-21 10:12:33'),
(5, 1, 3, 'subscribed', '2025-01-21 10:12:33'),
(6, 1, 1, 'unsubscribed', '2025-01-21 10:13:44'),
(7, 1, 2, 'unsubscribed', '2025-01-21 10:13:44'),
(8, 1, 3, 'unsubscribed', '2025-01-21 10:13:44');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `email_preferences`
--

DROP TABLE IF EXISTS `email_preferences`;
CREATE TABLE IF NOT EXISTS `email_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `campaign_id` int NOT NULL,
  `subscribed` tinyint(1) DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `campaign_id` (`campaign_id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `email_preferences`
--

INSERT INTO `email_preferences` (`id`, `user_id`, `campaign_id`, `subscribed`, `updated_at`) VALUES
(1, 1, 1, 0, '2025-01-21 15:13:44'),
(2, 1, 1, 0, '2025-01-21 15:13:44'),
(3, 1, 2, 0, '2025-01-21 15:13:44'),
(4, 1, 3, 0, '2025-01-21 15:13:44'),
(5, 1, 1, 0, '2025-01-21 15:13:44'),
(6, 1, 1, 0, '2025-01-21 15:13:44'),
(7, 1, 2, 0, '2025-01-21 15:13:44'),
(8, 1, 3, 0, '2025-01-21 15:13:44');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `financial_transactions`
--

DROP TABLE IF EXISTS `financial_transactions`;
CREATE TABLE IF NOT EXISTS `financial_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `transaction_type` enum('deposit','withdrawal','wager','bonus','refund','chargeback','adjustment') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `status` enum('pending','completed','failed','reversed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `description` text,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `financial_transactions`
--

INSERT INTO `financial_transactions` (`id`, `user_id`, `transaction_type`, `amount`, `currency`, `reference_id`, `payment_method`, `status`, `created_at`, `updated_at`, `description`) VALUES
(1, 1, 'deposit', 100.00, 'USD', 'TXN12345', 'credit_card', 'completed', '2024-12-26 22:47:25', '2025-01-02 15:28:58', 'Depósito inicial'),
(2, 1, 'wager', 50.00, 'USD', NULL, NULL, 'completed', '2024-12-26 22:47:25', '2025-01-02 15:28:58', 'Apuesta en juego de slots'),
(3, 2, 'withdrawal', 200.00, 'EUR', 'TXN67890', 'bank_transfer', 'pending', '2024-12-26 22:47:25', '2025-01-02 15:28:58', 'Retiro solicitado'),
(4, 3, 'bonus', 25.00, 'USD', NULL, NULL, 'completed', '2024-12-26 22:47:25', '2025-01-02 15:28:58', 'Bono de bienvenida'),
(5, 4, 'refund', 50.00, 'GBP', 'REF12345', NULL, 'completed', '2024-12-26 22:47:25', '2025-01-02 15:28:58', 'Reembolso de depósito fallido');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `games`
--

DROP TABLE IF EXISTS `games`;
CREATE TABLE IF NOT EXISTS `games` (
  `game_id` int NOT NULL AUTO_INCREMENT,
  `game_name` varchar(255) NOT NULL,
  `description` text,
  `image_url` varchar(500) DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`game_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `games`
--

INSERT INTO `games` (`game_id`, `game_name`, `description`, `image_url`, `provider`, `category`, `release_date`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Mega Slots', 'Spin the reels and win big!', 'https://casino.com/images/mega-slots.png', 'NetEnt', 'Slots', '2023-06-15', 'active', '2025-01-13 19:56:32', '2025-01-13 19:56:32'),
(2, 'Roulette Royale', 'Classic European roulette.', 'https://casino.com/images/roulette-royale.png', 'Evolution', 'Table Game', '2022-11-20', 'active', '2025-01-13 19:56:32', '2025-01-13 19:56:32'),
(3, 'Blackjack Elite', 'Play the classic Blackjack with high stakes.', 'https://casino.com/images/blackjack-elite.png', 'Playtech', 'Table Game', '2021-09-01', 'inactive', '2025-01-13 19:56:32', '2025-01-13 19:56:32');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `login_history`
--

DROP TABLE IF EXISTS `login_history`;
CREATE TABLE IF NOT EXISTS `login_history` (
  `login_history_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `login_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) NOT NULL,
  `device` varchar(100) DEFAULT NULL,
  `result` enum('success','failure') NOT NULL,
  PRIMARY KEY (`login_history_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `monthly_bonus_config`
--

DROP TABLE IF EXISTS `monthly_bonus_config`;
CREATE TABLE IF NOT EXISTS `monthly_bonus_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `immediate_claim_percentage` decimal(5,2) DEFAULT NULL,
  `calendar_claim_percentage` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `oauth_services`
--

DROP TABLE IF EXISTS `oauth_services`;
CREATE TABLE IF NOT EXISTS `oauth_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `client_id` varchar(255) NOT NULL,
  `client_secret` varchar(255) NOT NULL,
  `redirect_uri` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `promotions`
--

DROP TABLE IF EXISTS `promotions`;
CREATE TABLE IF NOT EXISTS `promotions` (
  `promotion_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `image_url` varchar(500) DEFAULT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'inactive',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `button_text` varchar(100) DEFAULT 'Learn More',
  `button_action_url` varchar(255) DEFAULT NULL,
  `button_status` enum('active','inactive') DEFAULT 'active',
  `featured_game_id` int DEFAULT NULL,
  PRIMARY KEY (`promotion_id`),
  KEY `featured_game_id` (`featured_game_id`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `promotions`
--

INSERT INTO `promotions` (`promotion_id`, `title`, `description`, `image_url`, `link_url`, `status`, `created_at`, `updated_at`, `button_text`, `button_action_url`, `button_status`, `featured_game_id`) VALUES
(1, 'Summer Sale', 'Get up to 50% off on selected games!', 'https://cdn.example.com/images/summer-sale.png', 'https://example.com/summer-sale', 'inactive', '2025-01-13 19:24:43', '2025-01-13 20:00:25', 'Play Now', 'https://casino.com/play', 'active', NULL),
(2, 'Summer Sale', 'Get up to 50% off on selected games!', 'https://cdn.example.com/images/summer-sale.png', 'https://example.com/summer-sale', 'active', '2025-01-13 19:24:46', '2025-01-13 19:24:46', 'Learn More', NULL, 'active', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rakeboost_config`
--

DROP TABLE IF EXISTS `rakeboost_config`;
CREATE TABLE IF NOT EXISTS `rakeboost_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `bonus_percentage` decimal(5,2) NOT NULL,
  `duration_hours` int NOT NULL,
  `trigger_activity` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rank_up_bonus_config`
--

DROP TABLE IF EXISTS `rank_up_bonus_config`;
CREATE TABLE IF NOT EXISTS `rank_up_bonus_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `rank` int NOT NULL,
  `total_wager` bigint NOT NULL,
  `rakeback` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `referrals`
--

DROP TABLE IF EXISTS `referrals`;
CREATE TABLE IF NOT EXISTS `referrals` (
  `referral_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ip_address` text NOT NULL,
  `campaign_id` int NOT NULL,
  `code` varchar(50) NOT NULL,
  `usage_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`referral_id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_referrals_campaign_id` (`campaign_id`),
  KEY `idx_referrals_user_id` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `referrals`
--

INSERT INTO `referrals` (`referral_id`, `user_id`, `ip_address`, `campaign_id`, `code`, `usage_count`, `created_at`, `updated_at`) VALUES
(1, 1, '127.0.0.1', 1, 'SUMMER2024', 5, '2025-01-16 14:54:30', '2025-01-18 19:31:25'),
(2, 2, '127.0.0.1', 1, 'HOTDEAL', 10, '2025-01-16 14:54:30', '2025-01-18 19:31:29'),
(3, 3, '127.0.0.1', 2, 'WINTERFUN', 2, '2025-01-16 14:54:30', '2025-01-18 19:31:32'),
(4, 4, '127.0.0.1', 3, 'SPRINGFLING', 8, '2025-01-16 14:54:30', '2025-01-18 19:31:35'),
(5, 5, '127.0.0.1', 3, 'BLOOM2024', 0, '2025-01-16 14:54:30', '2025-01-18 19:31:37'),
(6, 1, '127.0.0.1', 0, '2', 0, '2025-01-18 19:31:47', '2025-01-18 19:31:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reports_suspicious`
--

DROP TABLE IF EXISTS `reports_suspicious`;
CREATE TABLE IF NOT EXISTS `reports_suspicious` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `report_text` text NOT NULL,
  `reported_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','reviewed','resolved') DEFAULT 'pending',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `user_id` (`user_id`),
  KEY `reviewed_by` (`reviewed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `revenue`
--

DROP TABLE IF EXISTS `revenue`;
CREATE TABLE IF NOT EXISTS `revenue` (
  `revenue_id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `total_revenue` decimal(10,2) NOT NULL,
  `bets_count` int NOT NULL,
  `payouts_count` int NOT NULL,
  PRIMARY KEY (`revenue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `risk_events`
--

DROP TABLE IF EXISTS `risk_events`;
CREATE TABLE IF NOT EXISTS `risk_events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `risk_type` varchar(100) DEFAULT NULL,
  `description` text NOT NULL,
  `risk_level` enum('low','medium','high') DEFAULT NULL,
  `detected_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `risk_events`
--

INSERT INTO `risk_events` (`event_id`, `session_id`, `user_id`, `risk_type`, `description`, `risk_level`, `detected_at`) VALUES
(1, 6, 2, 'Suspicious Activity', 'Concurrent session detected from distant location. Distance: 16943.08 km', NULL, '2025-01-16 04:45:28'),
(2, 6, 2, 'Suspicious Activity', 'Concurrent session detected from distant location. Distance: 16943.08 km', NULL, '2025-01-16 04:48:20'),
(3, 4, 1, 'Suspicious Activity', 'Concurrent session detected from distant location. Distance: 4350.04 km', NULL, '2025-01-16 16:35:40'),
(4, 5, 1, 'Suspicious Activity', 'Concurrent session detected from distant location. Distance: 4350.04 km', NULL, '2025-01-16 16:35:40'),
(5, NULL, 1, 'Self-referral detected', 'User tried to refer themselves.', 'high', '2025-01-19 00:32:31'),
(6, 1, 1, 'Self-referral detected', 'Fraud detected: User tried to refer themselves. | Referral Code: 2 | IP: 127.0.0.1', 'high', '2025-01-19 00:35:40'),
(7, 1, 1, 'Self-referral detected', '🚨 **Fraud Detection Alert** 🚨\n                - **User ID:** 1\n                - **Session ID:** 1\n                - **Referral Code Used:** 2\n                - **IP Address:** 127.0.0.1\n                - **Risk Type:** Self-referral detected\n                - **Risk Level:** high\n                - **Detected At:** 2025-01-19T00:37:51.348Z\n                - **Details:** User tried to refer themselves.', 'high', '2025-01-19 00:37:51'),
(8, 1, 1, 'Self-referral detected', '🚨 **Fraud Detection Alert** 🚨\n                - **User ID:** 1\n                - **Session ID:** 1\n                - **Referral Code Used:** 2\n                - **IP Address:** 127.0.0.1\n                - **Risk Type:** Self-referral detected\n                - **Risk Level:** high\n                - **Detected At:** 2025-01-19T00:37:53.482Z\n                - **Details:** User tried to refer themselves.', 'high', '2025-01-19 00:37:53'),
(9, 1, 1, 'Self-referral detected', 'Fraud detected: User tried to refer themselves. | Referral Code: 2 | IP: 127.0.0.1', 'high', '2025-01-19 00:38:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sensitive_data`
--

DROP TABLE IF EXISTS `sensitive_data`;
CREATE TABLE IF NOT EXISTS `sensitive_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key_name` varchar(50) NOT NULL,
  `encrypted_value` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_key` (`key_name`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `sensitive_data`
--

INSERT INTO `sensitive_data` (`id`, `key_name`, `encrypted_value`, `created_at`, `updated_at`) VALUES
(1, 'token', '06c7fd77a325da1fd28d156475026df2:c10a783d95f59788a69d3e07fd370843', '2025-01-02 18:18:26', '2025-01-02 18:18:34'),
(2, 'apiKey', '35e8e493ca8448bb1809a2c00888cc8f:145094dd39cad313140ffedc9f7d35ce', '2025-01-02 18:18:26', '2025-01-02 18:18:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `serverlogs`
--

DROP TABLE IF EXISTS `serverlogs`;
CREATE TABLE IF NOT EXISTS `serverlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `msg` varchar(512) NOT NULL,
  `user` int DEFAULT NULL,
  `dataDate` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `systemlogs`
--

DROP TABLE IF EXISTS `systemlogs`;
CREATE TABLE IF NOT EXISTS `systemlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tittle` varchar(64) DEFAULT NULL,
  `msg` varchar(512) NOT NULL,
  `dateEvent` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `systemlogs`
--

INSERT INTO `systemlogs` (`id`, `tittle`, `msg`, `dateEvent`) VALUES
(1, 'ReferenceError: res2 is not defined', 'fail on get system logs', '2024-10-14 10:10:14'),
(2, 'ReferenceError: res is not defined', 'fail on get system logs', '2024-10-14 10:10:31'),
(3, 'Error exporting data', 'Error: Error: Cannot merge already merged cells', '2024-10-17 13:16:37'),
(4, 'Error exporting data', 'Error: Error: Cannot merge already merged cells', '2024-10-17 13:20:25'),
(5, 'Error exporting data', 'Error: ReferenceError: format is not defined', '2024-12-11 14:26:34'),
(6, 'Error exporting data', 'Error: ReferenceError: format is not defined', '2024-12-11 14:28:19'),
(7, 'Error exporting data', 'Error: Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client', '2024-12-11 14:57:12'),
(8, 'Error exporting data', 'Error: Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client', '2024-12-11 14:57:27'),
(9, 'Error exporting data', 'Error: Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client', '2024-12-11 15:34:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `terms_and_conditions`
--

DROP TABLE IF EXISTS `terms_and_conditions`;
CREATE TABLE IF NOT EXISTS `terms_and_conditions` (
  `version_id` int NOT NULL AUTO_INCREMENT,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`version_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `terms_and_conditions`
--

INSERT INTO `terms_and_conditions` (`version_id`, `content`, `created_at`, `updated_at`, `status`) VALUES
(1, 'Version 1: These are the terms and conditions for our platform.', '2024-12-26 22:50:40', '2025-01-06 14:21:28', 'archived'),
(2, 'Version 2: Updated terms and conditions including new privacy policies.', '2024-12-26 22:50:40', '2025-01-06 14:58:24', 'archived'),
(3, '5aed71bb6bd17b7076ba6634219cb15b:4172ff2761efc8f880f26f02a87b9f9ea49c594396f76070ee633094b3e238a4907551030aca424a2aefd710b65a90be39471e3224a13f21f968f16f77e90d36430496a3a7c52aa415afd036cda29b78a1b6c41b25d84040b7b87cd089a284f5', '2025-01-06 14:58:24', '2025-01-06 14:58:45', 'archived'),
(4, '672d2978904d3bccf230484b051b3bd3:00b185a433a93b0b164deb649a60be696af49eb2f55498d612d5dbc748079f753d154f04fe9e49969cf7bd7514b24a9df7416369bfafa202b503cfb37606a94be922298bd94c5cbb8b45fe6feba0f248cff19764356d7d9fa39f2b023bb72e20', '2025-01-06 14:58:45', '2025-01-06 14:58:45', 'active');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
CREATE TABLE IF NOT EXISTS `tournaments` (
  `tournament_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `tournament_bets` decimal(10,2) DEFAULT NULL,
  `points` decimal(10,2) DEFAULT NULL,
  `game_category` varchar(50) DEFAULT NULL,
  `award_place` int DEFAULT NULL,
  `confirmation_required` enum('applied','not applied') DEFAULT NULL,
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `strategy` enum('bet','win','rate','spin','points') DEFAULT NULL,
  `recurring` tinyint(1) DEFAULT NULL,
  `frontend_identifier` varchar(100) DEFAULT NULL,
  `group_tournament` tinyint(1) DEFAULT NULL,
  `player_groups` varchar(255) DEFAULT NULL,
  `bonus_group_key` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tournament_id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournaments`
--

INSERT INTO `tournaments` (`tournament_id`, `title`, `currency`, `tournament_bets`, `points`, `game_category`, `award_place`, `confirmation_required`, `start_at`, `end_at`, `strategy`, `recurring`, `frontend_identifier`, `group_tournament`, `player_groups`, `bonus_group_key`, `created_at`) VALUES
(15, 'All Time Slot Battles Leaderboard', 'EUR', 424.00, 424.00, 'slots', 213, 'not applied', '2024-05-20 14:18:00', '2030-05-20 14:18:00', 'bet', 0, 'SlotsLeaderboard', 0, 'Unranked', NULL, '2024-10-09 17:56:39'),
(41, 'Weekly Slot Battles', 'EUR', 424.00, 424.00, 'slots', 10, 'not applied', '2024-08-26 16:00:00', '2024-08-26 16:00:00', 'bet', 1, 'WeeklySlotBattles', 0, 'No Sweden', NULL, '2024-10-09 17:56:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_allowed_currencies`
--

DROP TABLE IF EXISTS `tournament_allowed_currencies`;
CREATE TABLE IF NOT EXISTS `tournament_allowed_currencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `min_bet` decimal(10,2) DEFAULT NULL,
  `max_bet` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_allowed_currencies`
--

INSERT INTO `tournament_allowed_currencies` (`id`, `tournament_id`, `currency`, `min_bet`, `max_bet`) VALUES
(1, 15, 'EUR', 0.00, 100.00),
(2, 15, 'USD', 0.00, 150.00),
(3, 41, 'EUR', 0.00, 100.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_individual_prizes`
--

DROP TABLE IF EXISTS `tournament_individual_prizes`;
CREATE TABLE IF NOT EXISTS `tournament_individual_prizes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int DEFAULT NULL,
  `prize` decimal(10,2) DEFAULT NULL,
  `money_award` decimal(10,2) DEFAULT NULL,
  `wager_multiplier` decimal(10,2) DEFAULT NULL,
  `redeemable_comp_points` decimal(10,2) DEFAULT NULL,
  `status_comp_points` decimal(10,2) DEFAULT NULL,
  `freespins_count` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_individual_prizes`
--

INSERT INTO `tournament_individual_prizes` (`id`, `tournament_id`, `prize`, `money_award`, `wager_multiplier`, `redeemable_comp_points`, `status_comp_points`, `freespins_count`) VALUES
(1, 15, 1.00, 200.00, 1.50, 100.00, 50.00, 10),
(2, 41, 1.00, 150.00, 2.00, 50.00, 20.00, 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_prize_pool`
--

DROP TABLE IF EXISTS `tournament_prize_pool`;
CREATE TABLE IF NOT EXISTS `tournament_prize_pool` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int DEFAULT NULL,
  `prize_type` enum('fixed','progressive') DEFAULT NULL,
  `money_budget` decimal(10,2) DEFAULT NULL,
  `redeemable_comp_points` decimal(10,2) DEFAULT NULL,
  `status_comp_points` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_prize_pool`
--

INSERT INTO `tournament_prize_pool` (`id`, `tournament_id`, `prize_type`, `money_budget`, `redeemable_comp_points`, `status_comp_points`) VALUES
(1, 15, 'fixed', 1000.00, 500.00, 200.00),
(2, 41, 'progressive', 500.00, 250.00, 100.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_top_players`
--

DROP TABLE IF EXISTS `tournament_top_players`;
CREATE TABLE IF NOT EXISTS `tournament_top_players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `award_place` int DEFAULT NULL,
  `bets_total` decimal(10,2) DEFAULT NULL,
  `wins_total` decimal(10,2) DEFAULT NULL,
  `redeemable_comp_points` decimal(10,2) DEFAULT NULL,
  `status_comp_points` decimal(10,2) DEFAULT NULL,
  `games_taken` int DEFAULT NULL,
  `points` int DEFAULT NULL,
  `rate` decimal(5,2) DEFAULT NULL,
  `last_bet_currency` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_top_players`
--

INSERT INTO `tournament_top_players` (`id`, `tournament_id`, `user_id`, `award_place`, `bets_total`, `wins_total`, `redeemable_comp_points`, `status_comp_points`, `games_taken`, `points`, `rate`, `last_bet_currency`) VALUES
(1, 15, 1, 213, 424.00, 94.03, 100.00, 50.00, 20, 424, 1.00, 'EUR'),
(2, 41, 1, 10, 424.00, 94.03, 100.00, 50.00, 20, 424, 1.00, 'EUR');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transaction_history`
--

DROP TABLE IF EXISTS `transaction_history`;
CREATE TABLE IF NOT EXISTS `transaction_history` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `type` enum('deposit','withdrawal','bet','win','bonus','gift') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','completed','failed') DEFAULT 'pending',
  `reference_id` varchar(100) DEFAULT NULL,
  `payment_method` enum('credit-card','paypal','bank-transfer') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `transaction_history`
--

INSERT INTO `transaction_history` (`transaction_id`, `user_id`, `type`, `amount`, `currency`, `transaction_date`, `status`, `reference_id`, `payment_method`) VALUES
(3, 1, 'deposit', 50.00, 'USD', '2024-10-27 21:29:53', 'completed', NULL, 'paypal'),
(4, 1, 'deposit', 50.00, 'USD', '2024-10-27 21:29:58', 'completed', NULL, 'credit-card'),
(5, 1, 'deposit', 50.00, 'USD', '2024-10-27 21:30:03', 'completed', NULL, 'bank-transfer'),
(6, 1, 'withdrawal', 50.00, 'USD', '2024-10-27 21:30:09', 'completed', NULL, 'paypal'),
(7, 1, 'withdrawal', 50.00, 'USD', '2024-10-27 21:30:13', 'completed', NULL, 'credit-card'),
(8, 1, 'withdrawal', 50.00, 'USD', '2024-10-27 21:30:17', 'completed', NULL, 'bank-transfer'),
(9, 1, 'deposit', 50.00, 'VEF', '2024-10-27 21:30:38', 'completed', NULL, 'paypal'),
(10, 1, 'gift', 50.00, 'USD', '2024-10-27 21:35:12', 'completed', '123456', 'bank-transfer'),
(11, 1, 'deposit', 100.00, 'COP', '2024-10-27 21:39:52', 'completed', NULL, 'credit-card'),
(12, 1, 'deposit', 100.00, 'COP', '2024-10-27 21:41:18', 'completed', NULL, 'paypal'),
(13, 1, 'withdrawal', 100.00, 'COP', '2024-10-27 21:41:26', 'completed', NULL, 'paypal'),
(14, 1, 'deposit', 100.00, 'COP', '2024-10-27 21:42:29', 'completed', NULL, 'bank-transfer'),
(15, 1, 'withdrawal', 50.00, 'COP', '2024-10-27 21:42:38', 'completed', NULL, 'bank-transfer'),
(16, 1, 'deposit', 1.00, 'ETH', '2024-12-12 21:51:34', 'completed', NULL, 'bank-transfer'),
(17, 1, 'gift', 1.00, 'ETH', '2024-12-12 21:51:46', 'completed', '123456', 'bank-transfer'),
(18, 1, 'gift', 1.00, 'ETH', '2024-12-12 21:52:34', 'completed', '123456', 'bank-transfer'),
(19, 1, 'gift', 1.00, 'ETH', '2024-12-12 21:52:40', 'completed', '123456', 'bank-transfer');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `username` text,
  `password_hash` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `byProvider` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('active','suspended','disabled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'active',
  `role` enum('user','admin') DEFAULT 'user',
  `last_login` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `_2fa_enabled` tinyint(1) DEFAULT '0',
  `country` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `currency` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `language` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'en',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `username`, `password_hash`, `byProvider`, `created_at`, `updated_at`, `status`, `role`, `last_login`, `_2fa_enabled`, `country`, `currency`, `language`) VALUES
(1, '3ed62dceee123b9d4fb75f2dfb8e2a2f:e8ba4e7526ae689ce25fad6505958d37', 'b3abb78fd1392e103a5ee8668a1d951c:0606d588e5e8d5070c9c67679b9134e9a21502a33ef6d9ba6fcc612b1a4661ca', '0eb55300704a2ef92a7b498bc7690bd6:7f5a012c3b5e3143ea4fbd533150e222', '$2b$12$SOcTykB.CAptdO6WOFoKPOERtH5Qo/O0q/KAaK1mOqxHKY/V.cZ1O', 0, '2024-10-27 16:27:44', '2025-01-20 17:01:04', 'active', 'user', '0000-00-00 00:00:00', 0, '0149c8680ca862e37750953ffd3cf60f:b13712402e1dec84923a1a0d67c3fc7a', '42a7599bceb916859d705f9427e7dca7:beba6c5d59fc43f315964c8f44238476', 'ecaa8008447f83957f5e91f17b53e48c:a8ffc0c037b1f9efda02190f24a5668a'),
(2, 'f42fd79640a71d15c9d0887d8109fe9f:77a62362fd2196e61d1fa17b82d8a86b', '50df5dea72266a0062678ac864d7c41f:f3fa96aada619ce6c3dd2a9a4eb400fe', NULL, 'hashed_password_2', 0, '2024-09-30 14:00:00', '2025-01-06 14:31:22', 'active', 'user', '0000-00-00 00:00:00', 0, 'c5f1387601b633b270383dacf3a2660a:0652fbf1e339b8f34cf02a080de35b15', 'a9e68417bac2ccb7423a7055f4c855c6:05a3789d937d27b66b38b570e3ce8b3a', 'b48fe37855f5218b09a501d92384e81b:24661586a5649235e4d5954ba8c9825c'),
(3, 'Mike Brown', 'mike.brown@example.com', NULL, 'hashed_password_3', 0, '2024-08-01 09:15:00', '2025-01-02 15:28:58', 'suspended', 'user', '2024-09-28 16:45:00', 0, 'Canada', 'CAD', 'fr'),
(4, 'Lisa White', 'lisa.white@example.com', NULL, 'hashed_password_4', 0, '2024-06-20 11:22:00', '2025-01-02 15:28:58', 'active', 'user', '2024-07-15 14:55:00', 1, 'Germany', 'EUR', 'de'),
(5, 'Tom Green', 'tom.green@example.com', NULL, 'hashed_password_5', 0, '2024-05-15 10:30:00', '2025-01-17 17:42:36', 'active', 'user', '2024-06-12 08:15:00', 1, 'Australia', 'AUD', 'en'),
(6, 'Emily Black', 'emily.black@example.com', NULL, 'hashed_password_6', 0, '2024-04-25 15:45:00', '2025-01-02 15:28:58', 'suspended', 'user', '2024-05-29 12:35:00', 0, 'France', 'EUR', 'fr'),
(7, 'Chris Blue', 'chris.blue@example.com', NULL, 'hashed_password_7', 0, '2024-03-12 13:30:00', '2025-01-02 15:28:58', 'active', 'user', '2024-04-01 09:00:00', 1, 'Japan', 'JPY', 'ja'),
(8, 'Sophia Gray', 'sophia.gray@example.com', NULL, 'hashed_password_8', 0, '2024-07-04 08:10:00', '2025-01-02 15:28:58', 'active', 'user', '2024-08-09 16:20:00', 1, 'Brazil', 'BRL', 'pt'),
(9, 'Daniel Yellow', 'daniel.yellow@example.com', NULL, 'hashed_password_9', 0, '2024-01-30 07:45:00', '2025-01-17 17:42:40', 'suspended', 'user', '2024-03-22 11:30:00', 1, 'Mexico', 'MXN', 'es'),
(10, 'Olivia Red', 'olivia.red@example.com', NULL, 'hashed_password_10', 0, '2024-02-14 17:50:00', '2025-01-02 15:28:58', 'active', 'user', '2024-03-01 13:15:00', 0, 'Italy', 'EUR', 'it'),
(11, 'Liam Orange', 'liam.orange@example.com', NULL, 'hashed_password_11', 0, '2024-03-25 19:00:00', '2025-01-02 15:28:58', 'active', 'user', '2024-04-18 12:45:00', 1, 'Spain', 'EUR', 'es'),
(12, 'Ella Purple', 'ella.purple@example.com', NULL, 'hashed_password_12', 0, '2024-05-05 09:25:00', '2025-01-17 17:42:43', 'active', 'user', '2024-06-01 15:00:00', 1, 'India', 'INR', 'hi'),
(13, 'James Pink', 'james.pink@example.com', NULL, 'hashed_password_13', 0, '2024-06-10 12:10:00', '2025-01-02 15:28:58', 'suspended', 'user', '2024-07-03 08:40:00', 0, 'China', 'CNY', 'zh'),
(14, 'Ava Cyan', 'ava.cyan@example.com', NULL, 'hashed_password_14', 0, '2024-07-19 14:55:00', '2025-01-02 15:28:58', 'active', 'user', '2024-08-11 11:35:00', 1, 'Russia', 'RUB', 'ru'),
(15, 'Mason Brown', 'mason.brown@example.com', NULL, 'hashed_password_15', 0, '2024-08-28 16:20:00', '2025-01-17 17:42:46', 'active', 'user', '2024-09-03 10:10:00', 0, 'Argentina', 'ARS', 'es'),
(16, 'Chloe Silver', 'chloe.silver@example.com', NULL, 'hashed_password_16', 0, '2024-09-05 13:45:00', '2025-01-02 15:28:58', 'active', 'user', '2024-09-30 14:20:00', 1, 'South Africa', 'ZAR', 'en'),
(17, 'Ethan Gold', 'ethan.gold@example.com', NULL, 'hashed_password_17', 0, '2024-10-01 15:30:00', '2025-01-02 15:28:58', 'suspended', 'user', '2024-10-04 12:05:00', 0, 'New Zealand', 'NZD', 'en'),
(18, 'Zoe White', 'zoe.white@example.com', NULL, 'hashed_password_18', 0, '2024-10-02 17:40:00', '2025-01-02 15:28:58', 'active', 'user', '2024-10-03 13:25:00', 1, 'South Korea', 'KRW', 'ko'),
(19, 'Jack Black', 'jack.black@example.com', NULL, 'hashed_password_19', 0, '2024-08-15 18:55:00', '2025-01-17 17:42:48', 'active', 'user', '2024-09-14 16:10:00', 1, 'Netherlands', 'EUR', 'nl'),
(20, 'Isabella Green', 'isabella.green@example.com', NULL, 'hashed_password_20', 0, '2024-07-07 08:30:00', '2025-01-02 15:28:58', 'active', 'user', '2024-08-20 09:50:00', 0, 'Singapore', 'SGD', 'en'),
(21, 'Mike Doe', 'daviddaco2@gmail.com', 'daviddaco2', '$2b$12$TArrE0B6VSsSBmKi3HKIXe8puOlI2RPXU16ygOnkA/fzLgaZLbLY2', 0, '2024-10-04 12:34:56', '2025-01-23 20:53:09', 'active', 'user', '2024-10-05 08:00:00', 1, 'USA', 'USD', 'en'),
(22, 'david', 'daviddaco1@gmail.com', 'daviddaco1', '$2b$12$TArrE0B6VSsSBmKi3HKIXe8puOlI2RPXU16ygOnkA/fzLgaZLbLY2', 0, '2025-01-14 19:58:31', '2025-01-23 20:53:13', 'active', 'user', '2025-01-14 19:58:31', 0, NULL, NULL, 'en');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users_activity_logs`
--

DROP TABLE IF EXISTS `users_activity_logs`;
CREATE TABLE IF NOT EXISTS `users_activity_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(256) NOT NULL,
  `dateEvent` varchar(64) NOT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `users_activity_logs`
--

INSERT INTO `users_activity_logs` (`log_id`, `user_id`, `action`, `dateEvent`) VALUES
(1, 1, 'Dio click en el boton 2', '2024-10-09 16:52:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_accounts`
--

DROP TABLE IF EXISTS `user_accounts`;
CREATE TABLE IF NOT EXISTS `user_accounts` (
  `account_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `balance` decimal(10,2) DEFAULT NULL,
  `deposit_sum` decimal(10,2) DEFAULT '0.00',
  `cashouts_sum` decimal(10,2) DEFAULT '0.00',
  `pending_cashouts_sum` decimal(10,2) DEFAULT '0.00',
  `chargebacks_sum` decimal(10,2) DEFAULT '0.00',
  `unreceived_deposits_sum` decimal(10,2) DEFAULT '0.00',
  `refunds_sum` decimal(10,2) DEFAULT '0.00',
  `reversals_sum` decimal(10,2) DEFAULT '0.00',
  `affiliate_payments_sum` decimal(10,2) DEFAULT '0.00',
  `avg_bet` decimal(10,2) DEFAULT '0.00',
  `gifts_sum` decimal(10,2) DEFAULT '0.00',
  `spent_in_casino` decimal(10,2) DEFAULT '0.00',
  `bonuses` decimal(10,2) DEFAULT '0.00',
  `bonus_ratio` decimal(5,2) DEFAULT '0.00',
  PRIMARY KEY (`account_id`),
  KEY `fk_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_accounts`
--

INSERT INTO `user_accounts` (`account_id`, `user_id`, `currency`, `balance`, `deposit_sum`, `cashouts_sum`, `pending_cashouts_sum`, `chargebacks_sum`, `unreceived_deposits_sum`, `refunds_sum`, `reversals_sum`, `affiliate_payments_sum`, `avg_bet`, `gifts_sum`, `spent_in_casino`, `bonuses`, `bonus_ratio`) VALUES
(1, 1, 'ETH', 104.00, 501.00, 200.00, 50.00, 10.00, 0.00, 5.00, 2.00, 25.00, 1.50, 13.00, 450.00, 50.00, 0.20),
(2, 1, 'EUR', 1.00, 1200.00, 800.00, 100.00, 20.00, 0.00, 15.00, 5.00, 50.00, 5.00, 20.00, 900.00, 75.00, 1.50),
(4, 1, 'USD', 100.00, 247.00, 200.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 50.00, 0.00, 0.00, 0.00),
(5, 1, 'AUD', 3.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(6, 1, 'COP', 2273.00, 300.00, 150.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(7, 1, 'VEF', 50.00, 50.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_ad_args`
--

DROP TABLE IF EXISTS `user_ad_args`;
CREATE TABLE IF NOT EXISTS `user_ad_args` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `ga` varchar(255) DEFAULT NULL,
  `utm_source` varchar(255) DEFAULT NULL,
  `utm_medium` varchar(255) DEFAULT NULL,
  `utm_campaign` varchar(255) DEFAULT NULL,
  `utm_content` varchar(255) DEFAULT NULL,
  `utm_term` varchar(255) DEFAULT NULL,
  `stag_affiliate` varchar(255) DEFAULT NULL,
  `stag_visit` varchar(255) DEFAULT NULL,
  `btag` varchar(255) DEFAULT NULL,
  `btag_net_refer` varchar(255) DEFAULT NULL,
  `qtag` varchar(255) DEFAULT NULL,
  `ref_code` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_ad_args`
--

INSERT INTO `user_ad_args` (`id`, `user_id`, `ga`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `stag_affiliate`, `stag_visit`, `btag`, `btag_net_refer`, `qtag`, `ref_code`, `created_at`, `updated_at`) VALUES
(1, 1, '46a19421-52f7-4cc9-897a-553dd4eb0427', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-10-08 19:39:49', '2025-01-02 15:28:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_affiliates`
--

DROP TABLE IF EXISTS `user_affiliates`;
CREATE TABLE IF NOT EXISTS `user_affiliates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `affiliate_id` int DEFAULT NULL,
  `affiliate_type` enum('rev_share','cpa') DEFAULT 'rev_share',
  `earnings` decimal(10,2) DEFAULT '0.00',
  `percentage_share` decimal(5,2) DEFAULT '0.00',
  `cpa_amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `affiliate_id` (`affiliate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_affiliates`
--

INSERT INTO `user_affiliates` (`id`, `user_id`, `affiliate_id`, `affiliate_type`, `earnings`, `percentage_share`, `cpa_amount`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'rev_share', 100.00, 20.00, 0.00, '2024-10-08 19:57:45', '2025-01-02 15:28:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_affiliate_profiles`
--

DROP TABLE IF EXISTS `user_affiliate_profiles`;
CREATE TABLE IF NOT EXISTS `user_affiliate_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `affiliate_id` int DEFAULT NULL,
  `profile_type` enum('rev_share','cpa') DEFAULT 'rev_share',
  `rev_share_percentage` decimal(5,2) DEFAULT '0.00',
  `cpa_amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `affiliate_id` (`affiliate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_affiliate_profiles`
--

INSERT INTO `user_affiliate_profiles` (`id`, `affiliate_id`, `profile_type`, `rev_share_percentage`, `cpa_amount`, `created_at`, `updated_at`) VALUES
(1, 1, 'rev_share', 25.00, 0.00, '2024-10-08 19:57:54', '2025-01-02 15:28:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_balances`
--

DROP TABLE IF EXISTS `user_balances`;
CREATE TABLE IF NOT EXISTS `user_balances` (
  `balance_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `balance` decimal(18,2) DEFAULT '0.00',
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP,
  `visibility` enum('visible','hidden') DEFAULT 'visible',
  PRIMARY KEY (`balance_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_balances`
--

INSERT INTO `user_balances` (`balance_id`, `user_id`, `currency`, `balance`, `last_updated`, `visibility`) VALUES
(1, 1, 'ETH', 104.00, '2025-01-23 13:55:23', 'visible'),
(2, 1, 'EUR', 1.00, '2025-01-23 13:55:23', 'visible'),
(3, 1, 'USD', 100.00, '2025-01-23 13:55:23', 'visible'),
(4, 1, 'AUD', 3.00, '2025-01-23 13:55:23', 'visible'),
(5, 1, 'COP', 2273.00, '2025-01-23 13:57:01', 'hidden'),
(6, 1, 'VEF', 50.00, '2025-01-23 13:55:23', 'visible');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_battle_pass`
--

DROP TABLE IF EXISTS `user_battle_pass`;
CREATE TABLE IF NOT EXISTS `user_battle_pass` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `level` int NOT NULL,
  `achieved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`level`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_bin_info`
--

DROP TABLE IF EXISTS `user_bin_info`;
CREATE TABLE IF NOT EXISTS `user_bin_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `payment_system` varchar(255) NOT NULL,
  `account` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `bank_country` varchar(10) NOT NULL,
  `stage` enum('successed','failed','pending') NOT NULL,
  `card_type` enum('credit','debit') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_bin_info`
--

INSERT INTO `user_bin_info` (`id`, `user_id`, `currency`, `payment_system`, `account`, `bank_name`, `bank_country`, `stage`, `card_type`) VALUES
(1, 1, 'AUD', 'devcode:creditcard', '406587******7182', 'Commonwealth Bank Of Australia', 'AU', 'successed', 'debit');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_bonuses`
--

DROP TABLE IF EXISTS `user_bonuses`;
CREATE TABLE IF NOT EXISTS `user_bonuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `bonus_type` varchar(50) NOT NULL,
  `immediate_claim` decimal(10,2) NOT NULL,
  `calendar_bonus` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`bonus_type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_challenges`
--

DROP TABLE IF EXISTS `user_challenges`;
CREATE TABLE IF NOT EXISTS `user_challenges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `challenge_id` int NOT NULL,
  `progress` int DEFAULT '0',
  `status` enum('in_progress','completed','expired') DEFAULT 'in_progress',
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `challenge_id` (`challenge_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_challenges`
--

INSERT INTO `user_challenges` (`id`, `user_id`, `challenge_id`, `progress`, `status`, `completed_at`) VALUES
(1, 1, 1, 250, 'in_progress', NULL),
(2, 2, 2, 100, 'completed', '2024-12-01 14:00:00'),
(3, 1, 3, 0, 'in_progress', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_comments`
--

DROP TABLE IF EXISTS `user_comments`;
CREATE TABLE IF NOT EXISTS `user_comments` (
  `comment_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `admin_email` varchar(100) NOT NULL,
  `comment_text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_comments`
--

INSERT INTO `user_comments` (`comment_id`, `user_id`, `admin_email`, `comment_text`, `created_at`) VALUES
(1, 1, 'admin@example.com', 'Este es un comentario de prueba', '2024-10-08 20:17:16'),
(17, 1, 'daviddaco1998@gmail.com', 'asdas', '2024-10-27 19:40:47'),
(18, 1, 'daviddaco1998@gmail.com', 'asda', '2024-10-27 19:40:52'),
(19, 1, 'daviddaco1998@gmail.com', 'azxczx', '2024-12-13 20:10:50'),
(20, 1, 'daviddaco1998@gmail.com', 'z', '2024-12-13 20:11:04'),
(21, 1, 'test@test.com', 'hello by api', '2025-01-14 19:47:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_consent_records`
--

DROP TABLE IF EXISTS `user_consent_records`;
CREATE TABLE IF NOT EXISTS `user_consent_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `version_id` int NOT NULL,
  `consent_status` enum('accepted','declined') NOT NULL,
  `consented_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `version_id` (`version_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_consent_records`
--

INSERT INTO `user_consent_records` (`id`, `user_id`, `version_id`, `consent_status`, `consented_at`) VALUES
(5, 1, 2, 'accepted', '2025-01-06 14:38:27'),
(7, 1, 4, 'accepted', '2025-01-06 17:07:35');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_currency_preferences`
--

DROP TABLE IF EXISTS `user_currency_preferences`;
CREATE TABLE IF NOT EXISTS `user_currency_preferences` (
  `user_id` int NOT NULL,
  `preferred_currency` varchar(10) DEFAULT 'USD',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_currency_preferences`
--

INSERT INTO `user_currency_preferences` (`user_id`, `preferred_currency`, `updated_at`) VALUES
(1, 'COP', '2025-01-23 13:20:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_details`
--

DROP TABLE IF EXISTS `user_details`;
CREATE TABLE IF NOT EXISTS `user_details` (
  `user_details_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `personal_id_number` varchar(50) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `receive_email_promos` enum('YES','NO') DEFAULT 'YES',
  `receive_sms_promos` enum('YES','NO') DEFAULT 'NO',
  `security_question` varchar(255) DEFAULT NULL,
  `security_answer` varchar(255) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `mobile_phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`user_details_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_details`
--

INSERT INTO `user_details` (`user_details_id`, `user_id`, `personal_id_number`, `first_name`, `last_name`, `nickname`, `date_of_birth`, `gender`, `city`, `address`, `postal_code`, `receive_email_promos`, `receive_sms_promos`, `security_question`, `security_answer`, `state`, `mobile_phone`) VALUES
(1, 1, '+1123123123', 'john', 'doe', 'john.doe', '1998-10-18', 'male', 'canada', 'canada address', '123465', 'NO', 'YES', 'question', 'answer', 'canada', '+1231231231');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_documents`
--

DROP TABLE IF EXISTS `user_documents`;
CREATE TABLE IF NOT EXISTS `user_documents` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(100) NOT NULL,
  `description` text,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','approved','not approved') DEFAULT 'pending',
  `is_approved` enum('YES','NO') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'NO',
  `origin` varchar(100) DEFAULT 'Origin',
  PRIMARY KEY (`document_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_documents`
--

INSERT INTO `user_documents` (`document_id`, `user_id`, `type`, `description`, `file_path`, `created_at`, `updated_at`, `status`, `is_approved`, `origin`) VALUES
(1, 1, 'image', 'Documento de identidad', 'ven_dni_1.jpg', '2024-10-08 20:14:07', '2025-01-02 15:28:58', 'pending', 'NO', 'Origin'),
(2, 1, 'xlsx', 'Documento de identidad', 'user_1.xlsx', '2024-10-08 20:14:07', '2025-01-02 15:28:58', 'pending', 'NO', 'Origin'),
(3, 1, 'image', 'Pasaporte', 'pasaporte.jpg', '2024-10-08 20:14:07', '2025-01-02 15:28:58', 'pending', 'NO', 'Origin'),
(4, 1, 'pdf', 'Documento de identidad', 'user_1.pdf', '2024-10-08 20:14:07', '2025-01-02 15:28:58', 'pending', 'NO', 'Origin');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_duplications`
--

DROP TABLE IF EXISTS `user_duplications`;
CREATE TABLE IF NOT EXISTS `user_duplications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `reason_uuid` varchar(255) DEFAULT NULL,
  `duplicated_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`reason_uuid`(191),`duplicated_user_id`),
  KEY `fk_reason_uuid` (`reason_uuid`(250)),
  KEY `fk_duplicated_user_id` (`duplicated_user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_duplications`
--

INSERT INTO `user_duplications` (`id`, `user_id`, `reason_uuid`, `duplicated_user_id`, `created_at`, `updated_at`) VALUES
(5, 1, '1', 2, '2025-01-14 20:02:54', '2025-01-14 20:02:54'),
(6, 1, '2', 2, '2025-01-14 20:03:05', '2025-01-14 20:03:27');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_extra_info`
--

DROP TABLE IF EXISTS `user_extra_info`;
CREATE TABLE IF NOT EXISTS `user_extra_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `app` varchar(50) DEFAULT NULL,
  `person` varchar(50) DEFAULT NULL,
  `customerio` varchar(50) DEFAULT NULL,
  `google_analytics` varchar(255) DEFAULT NULL,
  `last_tracked_country` varchar(10) DEFAULT NULL,
  `last_tracked_country_region` varchar(10) DEFAULT NULL,
  `psp_trusted_level` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_extra_info`
--

INSERT INTO `user_extra_info` (`id`, `user_id`, `app`, `person`, `customerio`, `google_analytics`, `last_tracked_country`, `last_tracked_country_region`, `psp_trusted_level`, `created_at`, `updated_at`) VALUES
(1, 1, 'casino', '38997625', 'orbet:4086', '46a19421-52f7-4cc9-897a-553dd4eb0427', 'Canada', 'AB', 'trusted_verified', '2024-10-08 19:44:17', '2025-01-02 15:28:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_free_spins`
--

DROP TABLE IF EXISTS `user_free_spins`;
CREATE TABLE IF NOT EXISTS `user_free_spins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `spins` int NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `claimed_spins` int DEFAULT '0',
  `remaining_spins` int GENERATED ALWAYS AS ((`spins` - `claimed_spins`)) STORED,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_groups`
--

DROP TABLE IF EXISTS `user_groups`;
CREATE TABLE IF NOT EXISTS `user_groups` (
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`group_id`),
  KEY `group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_groups`
--

INSERT INTO `user_groups` (`user_id`, `group_id`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_groups_list`
--

DROP TABLE IF EXISTS `user_groups_list`;
CREATE TABLE IF NOT EXISTS `user_groups_list` (
  `group_id` int NOT NULL AUTO_INCREMENT,
  `group_name` varchar(50) NOT NULL,
  PRIMARY KEY (`group_id`),
  UNIQUE KEY `group_name` (`group_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_groups_list`
--

INSERT INTO `user_groups_list` (`group_id`, `group_name`) VALUES
(1, 'group1'),
(2, 'group2'),
(3, 'group3'),
(4, 'group4'),
(5, 'group5'),
(6, 'group6'),
(7, 'group7'),
(8, 'group8');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_ignores`
--

DROP TABLE IF EXISTS `user_ignores`;
CREATE TABLE IF NOT EXISTS `user_ignores` (
  `ignore_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ignored_user_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ignore_id`),
  UNIQUE KEY `user_id` (`user_id`,`ignored_user_id`),
  KEY `ignored_user_id` (`ignored_user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_ignores`
--

INSERT INTO `user_ignores` (`ignore_id`, `user_id`, `ignored_user_id`, `created_at`) VALUES
(1, 1, '5a8e4769d8e48032e575885eee38ccc2:ad42c487fa17e9cf28aeccdacb3dc4ca', '2025-01-20 16:47:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_info`
--

DROP TABLE IF EXISTS `user_info`;
CREATE TABLE IF NOT EXISTS `user_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `current_sign_in_country` varchar(10) DEFAULT NULL,
  `current_sign_in_at` datetime DEFAULT NULL,
  `current_sign_in_ip` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_in_country` varchar(10) DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `two_factor_auth_enabled` enum('YES','NO') DEFAULT 'NO',
  `terms_accepted_at` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_info`
--

INSERT INTO `user_info` (`id`, `user_id`, `full_name`, `current_sign_in_country`, `current_sign_in_at`, `current_sign_in_ip`, `created_at`, `created_in_country`, `confirmed_at`, `two_factor_auth_enabled`, `terms_accepted_at`) VALUES
(1, 1, 'John Doe', 'Canada', '2024-10-08 14:41:05', '127.0.0.1', '2024-10-08 19:41:56', 'Canada', '2024-10-01 14:41:05', 'NO', '2024-10-02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_ips`
--

DROP TABLE IF EXISTS `user_ips`;
CREATE TABLE IF NOT EXISTS `user_ips` (
  `ip_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `used_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ip_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_ips`
--

INSERT INTO `user_ips` (`ip_id`, `user_id`, `ip_address`, `used_at`) VALUES
(1, 1, '127.0.0.1', '2025-01-02 15:28:58'),
(2, 1, '127.0.0.2', '2025-01-02 15:28:58'),
(3, 1, '192.168.1.1', '2025-01-02 15:28:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_issued_bonuses`
--

DROP TABLE IF EXISTS `user_issued_bonuses`;
CREATE TABLE IF NOT EXISTS `user_issued_bonuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `issued_at` datetime NOT NULL,
  `bonus` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `strategy` varchar(255) DEFAULT 'undefined',
  `stage` enum('Active','Completed','Expired') NOT NULL,
  `amount_locked` decimal(10,2) DEFAULT '0.00',
  `wager` varchar(255) DEFAULT 'undefined',
  `expiry_date` datetime NOT NULL,
  `related_account_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `related_account_id` (`related_account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_issued_bonuses`
--

INSERT INTO `user_issued_bonuses` (`id`, `user_id`, `issued_at`, `bonus`, `amount`, `strategy`, `stage`, `amount_locked`, `wager`, `expiry_date`, `related_account_id`) VALUES
(1, 1, '2024-10-17 19:47:41', 'Welcome Bonus', 100.00, 'Initial Deposit Match', 'Active', 0.00, '10x Deposit', '2024-12-31 23:59:59', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_issued_empty_bonuses`
--

DROP TABLE IF EXISTS `user_issued_empty_bonuses`;
CREATE TABLE IF NOT EXISTS `user_issued_empty_bonuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_issued_empty_bonuses`
--

INSERT INTO `user_issued_empty_bonuses` (`id`, `user_id`, `issued_at`) VALUES
(1, 1, '2024-10-09 20:12:41'),
(2, 1, '2024-10-09 20:12:41');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_issued_freespins`
--

DROP TABLE IF EXISTS `user_issued_freespins`;
CREATE TABLE IF NOT EXISTS `user_issued_freespins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `source_type` enum('dsl','api','referral_system') NOT NULL,
  `issued_at` datetime NOT NULL,
  `freespin_bonus` varchar(255) NOT NULL,
  `strategy` enum('deposit','signup','referral') NOT NULL,
  `stage` enum('played','active','expired') NOT NULL,
  `win_amount` decimal(10,2) NOT NULL,
  `activate_until` datetime NOT NULL,
  `expiry_date` datetime NOT NULL,
  `currency` varchar(10) DEFAULT 'CAD',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_issued_freespins`
--

INSERT INTO `user_issued_freespins` (`id`, `user_id`, `source_type`, `issued_at`, `freespin_bonus`, `strategy`, `stage`, `win_amount`, `activate_until`, `expiry_date`, `currency`) VALUES
(1, 1, 'api', '2024-10-01 15:37:54', 'Welcome Freespin Bonus', 'deposit', 'played', 20.47, '2024-10-08 15:37:54', '2024-10-15 15:54:22', 'CAD');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_kyc`
--

DROP TABLE IF EXISTS `user_kyc`;
CREATE TABLE IF NOT EXISTS `user_kyc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_id` int NOT NULL,
  `document_type` enum('passport','id_card','driver_license','utility_bill') NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `rejection_reason` varchar(255) DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `document_id` (`document_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_kyc`
--

INSERT INTO `user_kyc` (`id`, `user_id`, `document_id`, `document_type`, `status`, `rejection_reason`, `submitted_at`, `reviewed_at`) VALUES
(1, 1, 1, 'passport', 'approved', NULL, '2024-12-26 14:44:05', '2024-12-01 10:00:00'),
(2, 1, 2, 'id_card', 'rejected', 'Documento ilegible', '2024-12-26 14:44:05', '2024-12-05 15:30:00'),
(3, 1, 3, 'driver_license', 'pending', NULL, '2024-12-26 14:44:05', NULL),
(4, 1, 4, 'utility_bill', 'pending', NULL, '2024-12-26 14:44:05', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_latest_payments`
--

DROP TABLE IF EXISTS `user_latest_payments`;
CREATE TABLE IF NOT EXISTS `user_latest_payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` enum('deposit','withdrawal') NOT NULL,
  `source` varchar(255) NOT NULL,
  `account` varchar(255) DEFAULT NULL,
  `source_of_approval` varchar(255) DEFAULT NULL,
  `manual` enum('yes','no') DEFAULT 'no',
  `return_type` enum('instant','delayed') DEFAULT 'instant',
  `comments` text,
  `sumsub_pmv` varchar(255) DEFAULT '0',
  `success` enum('yes','no') DEFAULT 'no',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_latest_payments`
--

INSERT INTO `user_latest_payments` (`payment_id`, `user_id`, `action`, `source`, `account`, `source_of_approval`, `manual`, `return_type`, `comments`, `sumsub_pmv`, `success`, `created_at`, `finished_at`, `amount`, `currency`) VALUES
(1, 1, 'deposit', 'Devcode - Webredirect - APM76_TRUSTLY - APM76', 'Account 1', 'Admin 1', 'no', 'instant', 'N/A', '0', 'yes', '2024-09-28 22:05:33', '2024-09-28 22:05:55', 30.00, 'EUR'),
(2, 1, 'deposit', 'Fintechub Seamless - APM37-Pay via bank', 'Account 2', 'Admin 2', 'no', 'instant', 'N/A', '0', 'no', '2024-09-28 22:04:45', '2024-09-28 22:04:46', 30.00, 'EUR'),
(3, 1, 'deposit', 'Fintechub Seamless - APM37-Pay via bank', 'Account 3', 'Admin 3', 'no', 'instant', 'N/A', '0', 'no', '2024-09-28 22:04:26', '2024-09-28 22:04:28', 30.00, 'EUR');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_locks`
--

DROP TABLE IF EXISTS `user_locks`;
CREATE TABLE IF NOT EXISTS `user_locks` (
  `lock_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('Cs reason','Sb reason') NOT NULL,
  `comment` text,
  PRIMARY KEY (`lock_id`),
  KEY `fk_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_locks`
--

INSERT INTO `user_locks` (`lock_id`, `user_id`, `type`, `comment`) VALUES
(1, 1, 'Cs reason', 'ilegal program'),
(2, 1, 'Sb reason', 'Hacks');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_modes`
--

DROP TABLE IF EXISTS `user_modes`;
CREATE TABLE IF NOT EXISTS `user_modes` (
  `user_id` int NOT NULL,
  `privacy_mode` tinyint(1) DEFAULT '0',
  `streamer_mode` tinyint(1) DEFAULT '0',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_modes`
--

INSERT INTO `user_modes` (`user_id`, `privacy_mode`, `streamer_mode`, `updated_at`) VALUES
(1, 1, 1, '2025-01-23 13:13:54');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_net_total`
--

DROP TABLE IF EXISTS `user_net_total`;
CREATE TABLE IF NOT EXISTS `user_net_total` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `total_bets` decimal(10,2) NOT NULL,
  `total_wins` decimal(10,2) NOT NULL,
  `bonuses` decimal(10,2) NOT NULL,
  `net_total` decimal(10,2) NOT NULL,
  `payout_percentage` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_net_total`
--

INSERT INTO `user_net_total` (`id`, `user_id`, `currency`, `total_bets`, `total_wins`, `bonuses`, `net_total`, `payout_percentage`) VALUES
(1, 1, 'EUR', 296.60, 94.03, 102.57, 100.00, 31.70);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_payments`
--

DROP TABLE IF EXISTS `user_payments`;
CREATE TABLE IF NOT EXISTS `user_payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` enum('deposit','withdrawal') NOT NULL,
  `source` varchar(255) DEFAULT NULL,
  `account` varchar(255) DEFAULT NULL,
  `source_of_approval` varchar(255) DEFAULT NULL,
  `manual` tinyint(1) DEFAULT '0',
  `return_type` enum('success','failure') DEFAULT 'success',
  `comments` text,
  `sumsub_pmv` varchar(255) DEFAULT NULL,
  `success` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_payments`
--

INSERT INTO `user_payments` (`payment_id`, `user_id`, `action`, `source`, `account`, `source_of_approval`, `manual`, `return_type`, `comments`, `sumsub_pmv`, `success`, `created_at`, `finished_at`, `amount`, `currency`) VALUES
(1, 1, 'deposit', 'Finteqhub - Interac®', NULL, NULL, 0, 'success', NULL, NULL, 0, '2024-10-04 17:19:53', '2024-10-04 12:19:03', 30.00, 'CAD');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_payment_accounts`
--

DROP TABLE IF EXISTS `user_payment_accounts`;
CREATE TABLE IF NOT EXISTS `user_payment_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `payment_provider` varchar(255) NOT NULL,
  `payment_system` varchar(255) NOT NULL,
  `payment_platform` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_payment_accounts`
--

INSERT INTO `user_payment_accounts` (`id`, `user_id`, `payment_provider`, `payment_system`, `payment_platform`) VALUES
(1, 1, 'fintechub seamless', 'impaya', 'apple-pay'),
(2, 1, 'devcode', 'trustly', 'bank-transfer');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_payment_system_debts`
--

DROP TABLE IF EXISTS `user_payment_system_debts`;
CREATE TABLE IF NOT EXISTS `user_payment_system_debts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `system_name` varchar(255) NOT NULL,
  `account_in_system` varchar(255) NOT NULL,
  `payment_account` varchar(255) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `debit` decimal(10,2) NOT NULL,
  `verified` enum('YES','NO') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_payment_system_debts`
--

INSERT INTO `user_payment_system_debts` (`id`, `user_id`, `created_at`, `updated_at`, `system_name`, `account_in_system`, `payment_account`, `currency`, `debit`, `verified`) VALUES
(1, 1, '2024-08-28 15:39:47', '2024-08-28 15:39:47', 'devcode:creditcard', '100018296#da695a52-09b4-49ed-a4ff-97a318a96348', '406587******7182', 'AUD', 30.00, 'NO'),
(2, 1, '2024-08-21 21:13:07', '2024-08-21 21:13:07', 'fintechhub:neosurf', 'neosurf', '406587******7182', 'AUD', 30.00, 'NO');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_phones`
--

DROP TABLE IF EXISTS `user_phones`;
CREATE TABLE IF NOT EXISTS `user_phones` (
  `phone_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `phone_number` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `phone_type` enum('home','work','mobile') DEFAULT 'mobile',
  `verified` enum('verified','not verified') DEFAULT 'not verified',
  `status` enum('active','not active') NOT NULL DEFAULT 'not active',
  `added_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `country` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`phone_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_phones`
--

INSERT INTO `user_phones` (`phone_id`, `user_id`, `phone_number`, `phone_type`, `verified`, `status`, `added_at`, `country`) VALUES
(16, 1, 'cf1629a92fa498d03067f8f13c240e1b:89b4ca9240fd4d8976646df345e97848', 'mobile', 'not verified', 'not active', '2025-01-02 14:29:03', 'a781aee6b7c75ebe5e0e8a946351827a:3fb59f0c4066d6a5eaab87da9e5aefa9');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_preferences`
--

DROP TABLE IF EXISTS `user_preferences`;
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `user_id` int NOT NULL,
  `preference_key` varchar(100) NOT NULL,
  `preference_value` text NOT NULL,
  PRIMARY KEY (`user_id`,`preference_key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_preferences`
--

INSERT INTO `user_preferences` (`user_id`, `preference_key`, `preference_value`) VALUES
(1, 'theme', 'light'),
(1, 'language', 'en-US'),
(21, 'chat_consent_share', 'true');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_presence`
--

DROP TABLE IF EXISTS `user_presence`;
CREATE TABLE IF NOT EXISTS `user_presence` (
  `user_id` int NOT NULL,
  `status` enum('online','offline','away') DEFAULT 'offline',
  `last_active` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_presence`
--

INSERT INTO `user_presence` (`user_id`, `status`, `last_active`) VALUES
(22, 'online', '2025-01-24 12:42:00'),
(21, 'online', '2025-01-24 12:42:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_ranks`
--

DROP TABLE IF EXISTS `user_ranks`;
CREATE TABLE IF NOT EXISTS `user_ranks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `rank` int NOT NULL,
  `achieved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`rank`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `event_type` enum('User signed in','User sign out','User used new ip') NOT NULL,
  `ip` varchar(45) NOT NULL,
  `country` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `coordinates` point DEFAULT NULL,
  `status` enum('active','inactive','terminated') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_sessions`
--

INSERT INTO `user_sessions` (`session_id`, `user_id`, `event_date`, `event_type`, `ip`, `country`, `address`, `coordinates`, `status`, `created_at`, `updated_at`, `token`) VALUES
(3, 1, '2024-10-08 14:45:08', 'User used new ip', '127.0.0.2', 'Canada', 'Edmonton, T5Y Alberta Canada', 0x000000000101000000a4703d0ad7d34a409c33a2b437585cc0, 'active', '2025-01-15 16:25:08', '2025-01-15 16:25:08', NULL),
(4, 1, '2024-01-15 08:00:00', 'User signed in', '192.168.1.10', 'USA', 'New York, NY', 0x0000000001010000005e4bc8073d5b4440aaf1d24d628052c0, 'active', '2025-01-16 04:15:13', '2025-01-16 04:15:13', 'token_abc123'),
(5, 1, '2024-01-15 09:00:00', 'User signed in', '192.168.1.11', 'USA', 'New York, NY', 0x0000000001010000005e4bc8073d5b4440aaf1d24d628052c0, 'active', '2025-01-16 04:15:14', '2025-01-16 04:45:03', 'token_def456'),
(6, 2, '2024-01-15 08:00:00', 'User signed in', '172.16.0.10', 'USA', 'Los Angeles, CA', 0x000000000101000000f46c567dae0641404182e2c7988f5dc0, 'active', '2025-01-16 04:15:19', '2025-01-16 04:39:48', 'token_risk789');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_stag_assignment`
--

DROP TABLE IF EXISTS `user_stag_assignment`;
CREATE TABLE IF NOT EXISTS `user_stag_assignment` (
  `assignment_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `affiliate_url` varchar(255) NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`assignment_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_stag_assignment`
--

INSERT INTO `user_stag_assignment` (`assignment_id`, `user_id`, `affiliate_url`, `assigned_at`) VALUES
(1, 1, 'https://affiliate.example.com/stag-12345', '2024-10-09 20:09:42'),
(3, 1, 'asd', '2024-12-13 16:39:04'),
(4, 1, 'asdasd', '2024-12-13 20:07:52'),
(5, 1, 'www.test.com', '2025-01-14 20:04:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_suspicions`
--

DROP TABLE IF EXISTS `user_suspicions`;
CREATE TABLE IF NOT EXISTS `user_suspicions` (
  `suspicion_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `failed_check_comment` text,
  PRIMARY KEY (`suspicion_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_suspicions`
--

INSERT INTO `user_suspicions` (`suspicion_id`, `user_id`, `created_at`, `updated_at`, `failed_check_comment`) VALUES
(1, 1, '2024-10-08 16:25:21', '2025-01-02 15:28:59', 'User has debt to another payment system'),
(6, 1, '2024-12-13 16:45:19', '2025-01-02 15:28:59', 'e'),
(7, 1, '2025-01-14 19:49:52', '2025-01-14 19:49:52', 'hacks');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_tags`
--

DROP TABLE IF EXISTS `user_tags`;
CREATE TABLE IF NOT EXISTS `user_tags` (
  `user_id` int NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`tag_id`),
  KEY `tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_tags`
--

INSERT INTO `user_tags` (`user_id`, `tag_id`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_tags_list`
--

DROP TABLE IF EXISTS `user_tags_list`;
CREATE TABLE IF NOT EXISTS `user_tags_list` (
  `tag_id` int NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(50) NOT NULL,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `tag_name` (`tag_name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_tags_list`
--

INSERT INTO `user_tags_list` (`tag_id`, `tag_name`) VALUES
(1, 'tag1'),
(2, 'tag2'),
(3, 'tag3'),
(4, 'tag4'),
(5, 'tag5'),
(6, 'tag6'),
(7, 'tag7'),
(8, 'tag8');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_tournament_participation`
--

DROP TABLE IF EXISTS `user_tournament_participation`;
CREATE TABLE IF NOT EXISTS `user_tournament_participation` (
  `participation_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `tournament_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `tournament_bets` decimal(10,2) DEFAULT NULL,
  `points` decimal(10,2) DEFAULT NULL,
  `game_category` varchar(50) DEFAULT NULL,
  `award_place` int DEFAULT NULL,
  `confirmation_required` enum('applied','not applied') DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`participation_id`),
  KEY `user_id` (`user_id`),
  KEY `tournament_id` (`tournament_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_tournament_participation`
--

INSERT INTO `user_tournament_participation` (`participation_id`, `user_id`, `tournament_id`, `currency`, `tournament_bets`, `points`, `game_category`, `award_place`, `confirmation_required`, `end_at`, `created_at`) VALUES
(5, 1, 15, 'EUR', 424.00, 424.00, 'slots', 213, 'not applied', '2030-05-20 14:18:00', '2024-10-09 17:56:45'),
(6, 1, 41, 'EUR', 424.00, 424.00, 'slots', 10, 'not applied', '2024-08-26 16:00:00', '2024-10-09 17:56:45');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_transactions`
--

DROP TABLE IF EXISTS `user_transactions`;
CREATE TABLE IF NOT EXISTS `user_transactions` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `transaction_type` enum('credit','debit') NOT NULL,
  `status` enum('pending','completed','failed') NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_transactions`
--

INSERT INTO `user_transactions` (`transaction_id`, `user_id`, `amount`, `transaction_type`, `status`, `created_at`, `description`) VALUES
(1, 1, 100.00, 'credit', 'completed', '2025-01-15 10:30:00', 'Deposit to account'),
(2, 1, 50.00, 'debit', 'completed', '2025-01-16 14:15:00', 'Withdrawal from account'),
(3, 1, 25.00, 'credit', 'completed', '2025-01-17 08:45:00', 'Bonus credited'),
(4, 1, 150.00, 'credit', 'completed', '2025-01-18 12:00:00', 'Deposit to account'),
(5, 1, 75.00, 'debit', 'pending', '2025-01-19 09:30:00', 'Withdrawal request pending'),
(6, 1, 20.00, 'debit', 'completed', '2025-01-20 16:20:00', 'Bet placed'),
(7, 1, 10.00, 'credit', 'completed', '2025-01-21 13:40:00', 'Small bonus credited'),
(8, 1, 200.00, 'credit', 'completed', '2025-01-22 11:10:00', 'Deposit to account'),
(9, 1, 120.00, 'debit', 'completed', '2025-01-23 17:50:00', 'Withdrawal from account'),
(10, 1, 30.00, 'debit', 'completed', '2025-01-24 15:25:00', 'Bet placed');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_used_addresses`
--

DROP TABLE IF EXISTS `user_used_addresses`;
CREATE TABLE IF NOT EXISTS `user_used_addresses` (
  `user_id` int NOT NULL,
  `crypto_address` varchar(125) NOT NULL,
  `currency` varchar(50) NOT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`crypto_address`,`currency`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_used_addresses`
--

INSERT INTO `user_used_addresses` (`user_id`, `crypto_address`, `currency`, `used_at`) VALUES
(1, '0x1Ff8A8e6FdCccF2D4A77F76d3011B0E3DB9b2e6C', 'BNB', '2025-01-02 15:28:59'),
(1, '0x4E9ce36E442e55EcD9025B9a6E0D88485d628A67', 'ETH', '2025-01-02 15:28:59'),
(1, '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D', 'ETH', '2025-01-02 15:28:59'),
(1, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'BTC', '2025-01-02 15:28:59'),
(1, 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf0l5', 'BTC', '2025-01-02 15:28:59'),
(1, 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'BTC', '2025-01-02 15:28:59'),
(1, 'TB1sN6LKFUV8wt2GVHr3rYrXZ2fj9KxXDC', 'TRX', '2025-01-02 15:28:59'),
(1, 'TRJ3t9M5p1WZ3pAbA5TYVXzz9E8s42HYQY', 'TRC20-USDT', '2025-01-02 15:28:59'),
(1, 'TTpiDdP48nkWrC9BE4Zhh5TvkaZQwJwZVJ', 'TRX', '2025-01-02 15:28:59');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `wallet_visibility`
--

DROP TABLE IF EXISTS `wallet_visibility`;
CREATE TABLE IF NOT EXISTS `wallet_visibility` (
  `user_id` int NOT NULL,
  `is_visible` tinyint(1) DEFAULT '1',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `wallet_visibility`
--

INSERT INTO `wallet_visibility` (`user_id`, `is_visible`, `updated_at`) VALUES
(1, 0, '2025-01-23 13:57:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `wallet_visibility_audit`
--

DROP TABLE IF EXISTS `wallet_visibility_audit`;
CREATE TABLE IF NOT EXISTS `wallet_visibility_audit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `old_visibility` tinyint(1) DEFAULT NULL,
  `new_visibility` tinyint(1) DEFAULT NULL,
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `wallet_visibility_audit`
--

INSERT INTO `wallet_visibility_audit` (`id`, `user_id`, `old_visibility`, `new_visibility`, `changed_at`) VALUES
(1, 1, 0, 1, '2025-01-22 13:00:58'),
(2, 1, 1, 0, '2025-01-22 13:01:10'),
(3, 1, 1, 0, '2025-01-22 13:01:28'),
(4, 1, 0, 0, '2025-01-22 13:02:30'),
(5, 1, 1, 1, '2025-01-22 13:02:41'),
(6, 1, NULL, 1, '2025-01-22 13:03:06'),
(7, 1, NULL, 1, '2025-01-22 13:09:10'),
(8, 1, NULL, 1, '2025-01-22 13:09:35'),
(9, 1, NULL, 0, '2025-01-22 13:09:44'),
(10, 1, 0, 0, '2025-01-22 13:10:48'),
(11, 1, 0, 1, '2025-01-22 13:10:56'),
(12, 1, 1, 0, '2025-01-22 13:11:02'),
(13, 1, 0, 1, '2025-01-22 13:11:07'),
(14, 1, 1, 1, '2025-01-22 13:11:09'),
(15, 1, 0, 0, '2025-01-23 13:57:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `weekly_bonus_config`
--

DROP TABLE IF EXISTS `weekly_bonus_config`;
CREATE TABLE IF NOT EXISTS `weekly_bonus_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bonus_id` int NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `immediate_claim_percentage` decimal(5,2) DEFAULT NULL,
  `calendar_claim_percentage` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bonus_id` (`bonus_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `admins`
--
ALTER TABLE `admins`
  ADD CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`role_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`admin_id`);

--
-- Filtros para la tabla `bets`
--
ALTER TABLE `bets`
  ADD CONSTRAINT `bets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD CONSTRAINT `financial_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `login_history`
--
ALTER TABLE `login_history`
  ADD CONSTRAINT `login_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `reports_suspicious`
--
ALTER TABLE `reports_suspicious`
  ADD CONSTRAINT `reports_suspicious_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `reports_suspicious_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`admin_id`);

--
-- Filtros para la tabla `tournament_allowed_currencies`
--
ALTER TABLE `tournament_allowed_currencies`
  ADD CONSTRAINT `tournament_allowed_currencies_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`);

--
-- Filtros para la tabla `tournament_individual_prizes`
--
ALTER TABLE `tournament_individual_prizes`
  ADD CONSTRAINT `tournament_individual_prizes_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`);

--
-- Filtros para la tabla `tournament_prize_pool`
--
ALTER TABLE `tournament_prize_pool`
  ADD CONSTRAINT `tournament_prize_pool_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`);

--
-- Filtros para la tabla `tournament_top_players`
--
ALTER TABLE `tournament_top_players`
  ADD CONSTRAINT `tournament_top_players_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`),
  ADD CONSTRAINT `tournament_top_players_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `transaction_history`
--
ALTER TABLE `transaction_history`
  ADD CONSTRAINT `transaction_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_accounts`
--
ALTER TABLE `user_accounts`
  ADD CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_ad_args`
--
ALTER TABLE `user_ad_args`
  ADD CONSTRAINT `user_ad_args_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_affiliates`
--
ALTER TABLE `user_affiliates`
  ADD CONSTRAINT `user_affiliates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_affiliates_ibfk_2` FOREIGN KEY (`affiliate_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_affiliate_profiles`
--
ALTER TABLE `user_affiliate_profiles`
  ADD CONSTRAINT `user_affiliate_profiles_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_balances`
--
ALTER TABLE `user_balances`
  ADD CONSTRAINT `user_balances_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_bin_info`
--
ALTER TABLE `user_bin_info`
  ADD CONSTRAINT `user_bin_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_challenges`
--
ALTER TABLE `user_challenges`
  ADD CONSTRAINT `user_challenges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_challenges_ibfk_2` FOREIGN KEY (`challenge_id`) REFERENCES `challenges` (`challenge_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_comments`
--
ALTER TABLE `user_comments`
  ADD CONSTRAINT `user_comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_consent_records`
--
ALTER TABLE `user_consent_records`
  ADD CONSTRAINT `user_consent_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_consent_records_ibfk_2` FOREIGN KEY (`version_id`) REFERENCES `terms_and_conditions` (`version_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_details`
--
ALTER TABLE `user_details`
  ADD CONSTRAINT `user_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_documents`
--
ALTER TABLE `user_documents`
  ADD CONSTRAINT `user_documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_extra_info`
--
ALTER TABLE `user_extra_info`
  ADD CONSTRAINT `user_extra_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_groups`
--
ALTER TABLE `user_groups`
  ADD CONSTRAINT `user_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `user_groups_list` (`group_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_info`
--
ALTER TABLE `user_info`
  ADD CONSTRAINT `user_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_ips`
--
ALTER TABLE `user_ips`
  ADD CONSTRAINT `user_ips_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_issued_bonuses`
--
ALTER TABLE `user_issued_bonuses`
  ADD CONSTRAINT `user_issued_bonuses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_issued_bonuses_ibfk_2` FOREIGN KEY (`related_account_id`) REFERENCES `user_payment_accounts` (`id`);

--
-- Filtros para la tabla `user_issued_empty_bonuses`
--
ALTER TABLE `user_issued_empty_bonuses`
  ADD CONSTRAINT `user_issued_empty_bonuses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_issued_freespins`
--
ALTER TABLE `user_issued_freespins`
  ADD CONSTRAINT `user_issued_freespins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_kyc`
--
ALTER TABLE `user_kyc`
  ADD CONSTRAINT `user_kyc_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_kyc_ibfk_2` FOREIGN KEY (`document_id`) REFERENCES `user_documents` (`document_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_latest_payments`
--
ALTER TABLE `user_latest_payments`
  ADD CONSTRAINT `user_latest_payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_locks`
--
ALTER TABLE `user_locks`
  ADD CONSTRAINT `fk_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Filtros para la tabla `user_net_total`
--
ALTER TABLE `user_net_total`
  ADD CONSTRAINT `user_net_total_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_payments`
--
ALTER TABLE `user_payments`
  ADD CONSTRAINT `user_payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_payment_accounts`
--
ALTER TABLE `user_payment_accounts`
  ADD CONSTRAINT `user_payment_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_payment_system_debts`
--
ALTER TABLE `user_payment_system_debts`
  ADD CONSTRAINT `user_payment_system_debts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_phones`
--
ALTER TABLE `user_phones`
  ADD CONSTRAINT `user_phones_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_stag_assignment`
--
ALTER TABLE `user_stag_assignment`
  ADD CONSTRAINT `user_stag_assignment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_suspicions`
--
ALTER TABLE `user_suspicions`
  ADD CONSTRAINT `user_suspicions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_tags`
--
ALTER TABLE `user_tags`
  ADD CONSTRAINT `user_tags_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `user_tags_list` (`tag_id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_tournament_participation`
--
ALTER TABLE `user_tournament_participation`
  ADD CONSTRAINT `user_tournament_participation_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_tournament_participation_ibfk_2` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
