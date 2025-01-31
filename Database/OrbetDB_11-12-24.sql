-- phpMyAdmin SQL Dump
-- version 4.9.5deb2
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 11-12-2024 a las 15:47:13
-- Versión del servidor: 8.0.40-0ubuntu0.20.04.1
-- Versión de PHP: 7.4.3-4ubuntu2.24

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `OrbetDB`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`vendarisAdmin`@`localhost` PROCEDURE `getUserDataJSON` (IN `userId` INT)  BEGIN
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
                    FROM user_issued_bonuses b WHERE b.user_id = u.user_id)
    )
    INTO @result
    FROM users u
    WHERE u.user_id = userId;

    SELECT @result AS jsonResult;
END$$

CREATE DEFINER=`danieldev`@`%` PROCEDURE `getUserListNBalance` ()  BEGIN
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

CREATE TABLE `admins` (
  `admin_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('Tier 1','Tier 2','Tier 3','Tier 4') DEFAULT 'Tier 1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `role_description` varchar(255) DEFAULT 'Basic Access'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `admins`
--

INSERT INTO `admins` (`admin_id`, `name`, `email`, `password_hash`, `role`, `created_at`, `last_login`, `role_description`) VALUES
(1, 'Andres Ortiz', 'daviddaco1998@gmail.com', '$2a$12$ejddez71phkiP3LZBvLPd.ujZ.n1KjcWd6It0ru6QZryuYoL4TscK', 'Tier 1', '2024-09-26 17:59:34', NULL, 'Basic Access');

--
-- Disparadores `admins`
--
DELIMITER $$
CREATE TRIGGER `set_admin_role_description` BEFORE INSERT ON `admins` FOR EACH ROW BEGIN
    CASE NEW.role
        WHEN 'Tier 1' THEN SET NEW.role_description = 'Basic Access';
        WHEN 'Tier 2' THEN SET NEW.role_description = 'Medium Access';
        WHEN 'Tier 3' THEN SET NEW.role_description = 'High Level Access (Financial Access, to read not write)';
        WHEN 'Tier 4' THEN SET NEW.role_description = 'Ultra Instinct Level Access (Full Financial Access)';
    END CASE;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `adminsKeys`
--

CREATE TABLE `adminsKeys` (
  `id` int NOT NULL,
  `admin` int NOT NULL,
  `hash` varchar(256) NOT NULL,
  `expiry` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admins_sessions`
--

CREATE TABLE `admins_sessions` (
  `session_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `hash` varchar(128) DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `device` varchar(100) DEFAULT NULL,
  `login_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_time` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admin_activity_logs`
--

CREATE TABLE `admin_activity_logs` (
  `log_id` int NOT NULL,
  `user_id` int NOT NULL,
  `action` varchar(256) NOT NULL,
  `dateEvent` varchar(64) NOT NULL,
  `userAffected` int NOT NULL DEFAULT '-1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `admin_activity_logs`
--

INSERT INTO `admin_activity_logs` (`log_id`, `user_id`, `action`, `dateEvent`, `userAffected`) VALUES
(1, 1, 'Dio click en el boton 1', '2024-10-10 16:52:02', -1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int NOT NULL,
  `admin_id` int DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `affected_table` varchar(100) NOT NULL,
  `log_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `details` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bets`
--

CREATE TABLE `bets` (
  `bet_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `game` varchar(50) NOT NULL,
  `result` enum('win','lose','draw') NOT NULL,
  `payout` decimal(10,2) DEFAULT '0.00',
  `bet_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('completed','pending') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `login_history`
--

CREATE TABLE `login_history` (
  `login_history_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `login_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) NOT NULL,
  `device` varchar(100) DEFAULT NULL,
  `result` enum('success','failure') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reports_suspicious`
--

CREATE TABLE `reports_suspicious` (
  `report_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `report_text` text NOT NULL,
  `reported_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','reviewed','resolved') DEFAULT 'pending',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `revenue`
--

CREATE TABLE `revenue` (
  `revenue_id` int NOT NULL,
  `date` date NOT NULL,
  `total_revenue` decimal(10,2) NOT NULL,
  `bets_count` int NOT NULL,
  `payouts_count` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ServerLogs`
--

CREATE TABLE `ServerLogs` (
  `id` int NOT NULL,
  `msg` varchar(512) NOT NULL,
  `user` int DEFAULT NULL,
  `dataDate` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `system_logs`
--

CREATE TABLE `system_logs` (
  `id` int NOT NULL,
  `tittle` varchar(64) DEFAULT NULL,
  `msg` varchar(512) NOT NULL,
  `dateEvent` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `system_logs`
--

INSERT INTO `system_logs` (`id`, `tittle`, `msg`, `dateEvent`) VALUES
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
-- Estructura de tabla para la tabla `tournaments`
--

CREATE TABLE `tournaments` (
  `tournament_id` int NOT NULL,
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournaments`
--

INSERT INTO `tournaments` (`tournament_id`, `title`, `currency`, `tournament_bets`, `points`, `game_category`, `award_place`, `confirmation_required`, `start_at`, `end_at`, `strategy`, `recurring`, `frontend_identifier`, `group_tournament`, `player_groups`, `bonus_group_key`, `created_at`) VALUES
(15, 'All Time Slot Battles Leaderboard', 'EUR', '424.00', '424.00', 'slots', 213, 'not applied', '2024-05-20 14:18:00', '2030-05-20 14:18:00', 'bet', 0, 'SlotsLeaderboard', 0, 'Unranked', NULL, '2024-10-09 17:56:39'),
(41, 'Weekly Slot Battles', 'EUR', '424.00', '424.00', 'slots', 10, 'not applied', '2024-08-26 16:00:00', '2024-08-26 16:00:00', 'bet', 1, 'WeeklySlotBattles', 0, 'No Sweden', NULL, '2024-10-09 17:56:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_allowed_currencies`
--

CREATE TABLE `tournament_allowed_currencies` (
  `id` int NOT NULL,
  `tournament_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `min_bet` decimal(10,2) DEFAULT NULL,
  `max_bet` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_allowed_currencies`
--

INSERT INTO `tournament_allowed_currencies` (`id`, `tournament_id`, `currency`, `min_bet`, `max_bet`) VALUES
(1, 15, 'EUR', '0.00', '100.00'),
(2, 15, 'USD', '0.00', '150.00'),
(3, 41, 'EUR', '0.00', '100.00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_individual_prizes`
--

CREATE TABLE `tournament_individual_prizes` (
  `id` int NOT NULL,
  `tournament_id` int DEFAULT NULL,
  `prize` decimal(10,2) DEFAULT NULL,
  `money_award` decimal(10,2) DEFAULT NULL,
  `wager_multiplier` decimal(10,2) DEFAULT NULL,
  `redeemable_comp_points` decimal(10,2) DEFAULT NULL,
  `status_comp_points` decimal(10,2) DEFAULT NULL,
  `freespins_count` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_individual_prizes`
--

INSERT INTO `tournament_individual_prizes` (`id`, `tournament_id`, `prize`, `money_award`, `wager_multiplier`, `redeemable_comp_points`, `status_comp_points`, `freespins_count`) VALUES
(1, 15, '1.00', '200.00', '1.50', '100.00', '50.00', 10),
(2, 41, '1.00', '150.00', '2.00', '50.00', '20.00', 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_prize_pool`
--

CREATE TABLE `tournament_prize_pool` (
  `id` int NOT NULL,
  `tournament_id` int DEFAULT NULL,
  `prize_type` enum('fixed','progressive') DEFAULT NULL,
  `money_budget` decimal(10,2) DEFAULT NULL,
  `redeemable_comp_points` decimal(10,2) DEFAULT NULL,
  `status_comp_points` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_prize_pool`
--

INSERT INTO `tournament_prize_pool` (`id`, `tournament_id`, `prize_type`, `money_budget`, `redeemable_comp_points`, `status_comp_points`) VALUES
(1, 15, 'fixed', '1000.00', '500.00', '200.00'),
(2, 41, 'progressive', '500.00', '250.00', '100.00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tournament_top_players`
--

CREATE TABLE `tournament_top_players` (
  `id` int NOT NULL,
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
  `last_bet_currency` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tournament_top_players`
--

INSERT INTO `tournament_top_players` (`id`, `tournament_id`, `user_id`, `award_place`, `bets_total`, `wins_total`, `redeemable_comp_points`, `status_comp_points`, `games_taken`, `points`, `rate`, `last_bet_currency`) VALUES
(1, 15, 1, 213, '424.00', '94.03', '100.00', '50.00', 20, 424, '1.00', 'EUR'),
(2, 41, 1, 10, '424.00', '94.03', '100.00', '50.00', 20, 424, '1.00', 'EUR');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transaction_history`
--

CREATE TABLE `transaction_history` (
  `transaction_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `type` enum('deposit','withdrawal','bet','win','bonus','gift') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','completed','failed') DEFAULT 'pending',
  `reference_id` varchar(100) DEFAULT NULL,
  `payment_method` enum('credit-card','paypal','bank-transfer') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `transaction_history`
--

INSERT INTO `transaction_history` (`transaction_id`, `user_id`, `type`, `amount`, `currency`, `transaction_date`, `status`, `reference_id`, `payment_method`) VALUES
(3, 1, 'deposit', '50.00', 'USD', '2024-10-27 21:29:53', 'completed', NULL, 'paypal'),
(4, 1, 'deposit', '50.00', 'USD', '2024-10-27 21:29:58', 'completed', NULL, 'credit-card'),
(5, 1, 'deposit', '50.00', 'USD', '2024-10-27 21:30:03', 'completed', NULL, 'bank-transfer'),
(6, 1, 'withdrawal', '50.00', 'USD', '2024-10-27 21:30:09', 'completed', NULL, 'paypal'),
(7, 1, 'withdrawal', '50.00', 'USD', '2024-10-27 21:30:13', 'completed', NULL, 'credit-card'),
(8, 1, 'withdrawal', '50.00', 'USD', '2024-10-27 21:30:17', 'completed', NULL, 'bank-transfer'),
(9, 1, 'deposit', '50.00', 'VEF', '2024-10-27 21:30:38', 'completed', NULL, 'paypal'),
(10, 1, 'gift', '50.00', 'USD', '2024-10-27 21:35:12', 'completed', '123456', 'bank-transfer'),
(11, 1, 'deposit', '100.00', 'COP', '2024-10-27 21:39:52', 'completed', NULL, 'credit-card'),
(12, 1, 'deposit', '100.00', 'COP', '2024-10-27 21:41:18', 'completed', NULL, 'paypal'),
(13, 1, 'withdrawal', '100.00', 'COP', '2024-10-27 21:41:26', 'completed', NULL, 'paypal'),
(14, 1, 'deposit', '100.00', 'COP', '2024-10-27 21:42:29', 'completed', NULL, 'bank-transfer'),
(15, 1, 'withdrawal', '50.00', 'COP', '2024-10-27 21:42:38', 'completed', NULL, 'bank-transfer');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','suspended','disabled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'active',
  `role` enum('user','admin') DEFAULT 'user',
  `last_login` timestamp NULL DEFAULT NULL,
  `_2fa_enabled` tinyint(1) DEFAULT '0',
  `country` varchar(50) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `language` varchar(10) DEFAULT 'en'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `created_at`, `status`, `role`, `last_login`, `_2fa_enabled`, `country`, `currency`, `language`) VALUES
(1, 'John Doe', 'johndoe@example.com', 'hashed_password', '2024-10-27 16:27:44', 'active', 'user', '2024-10-04 16:27:44', 1, 'USA', 'USD', 'en'),
(2, 'Jane Smith', 'jane.smith@example.com', 'hashed_password_2', '2024-09-30 14:00:00', 'disabled', 'admin', '2024-10-02 10:30:00', 1, 'UK', 'GBP', 'en'),
(3, 'Mike Brown', 'mike.brown@example.com', 'hashed_password_3', '2024-08-01 09:15:00', 'suspended', 'user', '2024-09-28 16:45:00', 0, 'Canada', 'CAD', 'fr'),
(4, 'Lisa White', 'lisa.white@example.com', 'hashed_password_4', '2024-06-20 11:22:00', 'active', 'user', '2024-07-15 14:55:00', 1, 'Germany', 'EUR', 'de'),
(5, 'Tom Green', 'tom.green@example.com', 'hashed_password_5', '2024-05-15 10:30:00', 'active', 'admin', '2024-06-12 08:15:00', 1, 'Australia', 'AUD', 'en'),
(6, 'Emily Black', 'emily.black@example.com', 'hashed_password_6', '2024-04-25 15:45:00', 'suspended', 'user', '2024-05-29 12:35:00', 0, 'France', 'EUR', 'fr'),
(7, 'Chris Blue', 'chris.blue@example.com', 'hashed_password_7', '2024-03-12 13:30:00', 'active', 'user', '2024-04-01 09:00:00', 1, 'Japan', 'JPY', 'ja'),
(8, 'Sophia Gray', 'sophia.gray@example.com', 'hashed_password_8', '2024-07-04 08:10:00', 'active', 'user', '2024-08-09 16:20:00', 1, 'Brazil', 'BRL', 'pt'),
(9, 'Daniel Yellow', 'daniel.yellow@example.com', 'hashed_password_9', '2024-01-30 07:45:00', 'suspended', 'admin', '2024-03-22 11:30:00', 1, 'Mexico', 'MXN', 'es'),
(10, 'Olivia Red', 'olivia.red@example.com', 'hashed_password_10', '2024-02-14 17:50:00', 'active', 'user', '2024-03-01 13:15:00', 0, 'Italy', 'EUR', 'it'),
(11, 'Liam Orange', 'liam.orange@example.com', 'hashed_password_11', '2024-03-25 19:00:00', 'active', 'user', '2024-04-18 12:45:00', 1, 'Spain', 'EUR', 'es'),
(12, 'Ella Purple', 'ella.purple@example.com', 'hashed_password_12', '2024-05-05 09:25:00', 'active', 'admin', '2024-06-01 15:00:00', 1, 'India', 'INR', 'hi'),
(13, 'James Pink', 'james.pink@example.com', 'hashed_password_13', '2024-06-10 12:10:00', 'suspended', 'user', '2024-07-03 08:40:00', 0, 'China', 'CNY', 'zh'),
(14, 'Ava Cyan', 'ava.cyan@example.com', 'hashed_password_14', '2024-07-19 14:55:00', 'active', 'user', '2024-08-11 11:35:00', 1, 'Russia', 'RUB', 'ru'),
(15, 'Mason Brown', 'mason.brown@example.com', 'hashed_password_15', '2024-08-28 16:20:00', 'active', 'admin', '2024-09-03 10:10:00', 0, 'Argentina', 'ARS', 'es'),
(16, 'Chloe Silver', 'chloe.silver@example.com', 'hashed_password_16', '2024-09-05 13:45:00', 'active', 'user', '2024-09-30 14:20:00', 1, 'South Africa', 'ZAR', 'en'),
(17, 'Ethan Gold', 'ethan.gold@example.com', 'hashed_password_17', '2024-10-01 15:30:00', 'suspended', 'user', '2024-10-04 12:05:00', 0, 'New Zealand', 'NZD', 'en'),
(18, 'Zoe White', 'zoe.white@example.com', 'hashed_password_18', '2024-10-02 17:40:00', 'active', 'user', '2024-10-03 13:25:00', 1, 'South Korea', 'KRW', 'ko'),
(19, 'Jack Black', 'jack.black@example.com', 'hashed_password_19', '2024-08-15 18:55:00', 'active', 'admin', '2024-09-14 16:10:00', 1, 'Netherlands', 'EUR', 'nl'),
(20, 'Isabella Green', 'isabella.green@example.com', 'hashed_password_20', '2024-07-07 08:30:00', 'active', 'user', '2024-08-20 09:50:00', 0, 'Singapore', 'SGD', 'en'),
(21, 'Mike Doe', 'mike.doe@example.com', 'hashed_password_1', '2024-10-04 12:34:56', 'active', 'user', '2024-10-05 08:00:00', 1, 'USA', 'USD', 'en');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users_activity_logs`
--

CREATE TABLE `users_activity_logs` (
  `log_id` int NOT NULL,
  `user_id` int NOT NULL,
  `action` varchar(256) NOT NULL,
  `dateEvent` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `users_activity_logs`
--

INSERT INTO `users_activity_logs` (`log_id`, `user_id`, `action`, `dateEvent`) VALUES
(1, 1, 'Dio click en el boton 2', '2024-10-09 16:52:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_accounts`
--

CREATE TABLE `user_accounts` (
  `account_id` int NOT NULL,
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
  `bonus_ratio` decimal(5,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_accounts`
--

INSERT INTO `user_accounts` (`account_id`, `user_id`, `currency`, `balance`, `deposit_sum`, `cashouts_sum`, `pending_cashouts_sum`, `chargebacks_sum`, `unreceived_deposits_sum`, `refunds_sum`, `reversals_sum`, `affiliate_payments_sum`, `avg_bet`, `gifts_sum`, `spent_in_casino`, `bonuses`, `bonus_ratio`) VALUES
(1, 1, 'ETH', '101.00', '500.00', '200.00', '50.00', '10.00', '0.00', '5.00', '2.00', '25.00', '1.50', '10.00', '450.00', '50.00', '0.20'),
(2, 1, 'EUR', '1.00', '1200.00', '800.00', '100.00', '20.00', '0.00', '15.00', '5.00', '50.00', '5.00', '20.00', '900.00', '75.00', '1.50'),
(4, 1, 'USD', '100.00', '247.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50.00', '0.00', '0.00', '0.00'),
(5, 1, 'AUD', '3.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'),
(6, 1, 'COP', '1150.00', '300.00', '150.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'),
(7, 1, 'VEF', '50.00', '50.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_ad_args`
--

CREATE TABLE `user_ad_args` (
  `id` int NOT NULL,
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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_ad_args`
--

INSERT INTO `user_ad_args` (`id`, `user_id`, `ga`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `stag_affiliate`, `stag_visit`, `btag`, `btag_net_refer`, `qtag`, `ref_code`, `created_at`) VALUES
(1, 1, '46a19421-52f7-4cc9-897a-553dd4eb0427', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-10-08 19:39:49');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_affiliates`
--

CREATE TABLE `user_affiliates` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `affiliate_id` int DEFAULT NULL,
  `affiliate_type` enum('rev_share','cpa') DEFAULT 'rev_share',
  `earnings` decimal(10,2) DEFAULT '0.00',
  `percentage_share` decimal(5,2) DEFAULT '0.00',
  `cpa_amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_affiliates`
--

INSERT INTO `user_affiliates` (`id`, `user_id`, `affiliate_id`, `affiliate_type`, `earnings`, `percentage_share`, `cpa_amount`, `created_at`) VALUES
(1, 1, 2, 'rev_share', '100.00', '20.00', '0.00', '2024-10-08 19:57:45');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_affiliate_profiles`
--

CREATE TABLE `user_affiliate_profiles` (
  `id` int NOT NULL,
  `affiliate_id` int DEFAULT NULL,
  `profile_type` enum('rev_share','cpa') DEFAULT 'rev_share',
  `rev_share_percentage` decimal(5,2) DEFAULT '0.00',
  `cpa_amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_affiliate_profiles`
--

INSERT INTO `user_affiliate_profiles` (`id`, `affiliate_id`, `profile_type`, `rev_share_percentage`, `cpa_amount`, `created_at`) VALUES
(1, 1, 'rev_share', '25.00', '0.00', '2024-10-08 19:57:54');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_balances`
--

CREATE TABLE `user_balances` (
  `balance_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `balance` decimal(18,2) DEFAULT '0.00',
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_balances`
--

INSERT INTO `user_balances` (`balance_id`, `user_id`, `currency`, `balance`, `last_updated`) VALUES
(1, 1, 'ETH', '101.00', '2024-10-27 20:50:50'),
(2, 1, 'EUR', '1.00', '2024-10-04 16:54:28'),
(3, 1, 'USD', '100.00', '2024-10-27 21:35:12'),
(4, 1, 'AUD', '3.00', '2024-10-27 20:59:35'),
(5, 1, 'COP', '1150.00', '2024-10-27 21:42:38'),
(6, 1, 'VEF', '50.00', '2024-10-27 21:30:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_bin_info`
--

CREATE TABLE `user_bin_info` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `payment_system` varchar(255) NOT NULL,
  `account` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `bank_country` varchar(10) NOT NULL,
  `stage` enum('successed','failed','pending') NOT NULL,
  `card_type` enum('credit','debit') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_bin_info`
--

INSERT INTO `user_bin_info` (`id`, `user_id`, `currency`, `payment_system`, `account`, `bank_name`, `bank_country`, `stage`, `card_type`) VALUES
(1, 1, 'AUD', 'devcode:creditcard', '406587******7182', 'Commonwealth Bank Of Australia', 'AU', 'successed', 'debit');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_comments`
--

CREATE TABLE `user_comments` (
  `comment_id` int NOT NULL,
  `user_id` int NOT NULL,
  `admin_email` varchar(100) NOT NULL,
  `comment_text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_comments`
--

INSERT INTO `user_comments` (`comment_id`, `user_id`, `admin_email`, `comment_text`, `created_at`) VALUES
(1, 1, 'admin@example.com', 'Este es un comentario de prueba', '2024-10-08 20:17:16'),
(17, 1, 'daviddaco1998@gmail.com', 'asdas', '2024-10-27 19:40:47'),
(18, 1, 'daviddaco1998@gmail.com', 'asda', '2024-10-27 19:40:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_details`
--

CREATE TABLE `user_details` (
  `user_details_id` int NOT NULL,
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
  `mobile_phone` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_details`
--

INSERT INTO `user_details` (`user_details_id`, `user_id`, `personal_id_number`, `first_name`, `last_name`, `nickname`, `date_of_birth`, `gender`, `city`, `address`, `postal_code`, `receive_email_promos`, `receive_sms_promos`, `security_question`, `security_answer`, `state`, `mobile_phone`) VALUES
(1, 1, '+1123123123', 'john', 'doe', 'john.doe', '1998-10-18', 'male', 'canada', 'canada address', '123465', 'NO', 'YES', 'question', 'answer', 'canada', '+1231231231');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_documents`
--

CREATE TABLE `user_documents` (
  `document_id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(100) NOT NULL,
  `description` text,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','approved','not approved') DEFAULT 'pending',
  `is_approved` enum('YES','NO') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'NO',
  `origin` varchar(100) DEFAULT 'Origin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_documents`
--

INSERT INTO `user_documents` (`document_id`, `user_id`, `type`, `description`, `file_path`, `created_at`, `status`, `is_approved`, `origin`) VALUES
(1, 1, 'image', 'Documento de identidad', 'ven_dni_1.jpg', '2024-10-08 20:14:07', 'pending', 'NO', 'Origin'),
(2, 1, 'xlsx', 'Documento de identidad', 'user_1.xlsx', '2024-10-08 20:14:07', 'pending', 'NO', 'Origin'),
(3, 1, 'image', 'Pasaporte', 'pasaporte.jpg', '2024-10-08 20:14:07', 'pending', 'NO', 'Origin'),
(4, 1, 'pdf', 'Documento de identidad', 'user_1.pdf', '2024-10-08 20:14:07', 'pending', 'NO', 'Origin');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_duplications`
--

CREATE TABLE `user_duplications` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `duplicated_user_id` int DEFAULT NULL,
  `reason_uuid` varchar(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_duplications`
--

INSERT INTO `user_duplications` (`id`, `user_id`, `duplicated_user_id`, `reason_uuid`, `created_at`) VALUES
(1, 1, 2, 'posible multicuenta', '2024-10-08 19:36:26');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_extra_info`
--

CREATE TABLE `user_extra_info` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `app` varchar(50) DEFAULT NULL,
  `person` varchar(50) DEFAULT NULL,
  `customerio` varchar(50) DEFAULT NULL,
  `google_analytics` varchar(255) DEFAULT NULL,
  `last_tracked_country` varchar(10) DEFAULT NULL,
  `last_tracked_country_region` varchar(10) DEFAULT NULL,
  `psp_trusted_level` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_extra_info`
--

INSERT INTO `user_extra_info` (`id`, `user_id`, `app`, `person`, `customerio`, `google_analytics`, `last_tracked_country`, `last_tracked_country_region`, `psp_trusted_level`, `created_at`) VALUES
(1, 1, 'casino', '38997625', 'orbet:4086', '46a19421-52f7-4cc9-897a-553dd4eb0427', 'Canada', 'AB', 'trusted_verified', '2024-10-08 19:44:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_groups`
--

CREATE TABLE `user_groups` (
  `user_id` int NOT NULL,
  `group_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_groups`
--

INSERT INTO `user_groups` (`user_id`, `group_id`) VALUES
(1, 2),
(1, 8);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_groups_list`
--

CREATE TABLE `user_groups_list` (
  `group_id` int NOT NULL,
  `group_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
-- Estructura de tabla para la tabla `user_info`
--

CREATE TABLE `user_info` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `current_sign_in_country` varchar(10) DEFAULT NULL,
  `current_sign_in_at` datetime DEFAULT NULL,
  `current_sign_in_ip` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_in_country` varchar(10) DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `two_factor_auth_enabled` enum('YES','NO') DEFAULT 'NO',
  `terms_accepted_at` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_info`
--

INSERT INTO `user_info` (`id`, `user_id`, `full_name`, `current_sign_in_country`, `current_sign_in_at`, `current_sign_in_ip`, `created_at`, `created_in_country`, `confirmed_at`, `two_factor_auth_enabled`, `terms_accepted_at`) VALUES
(1, 1, 'John Doe', 'Canada', '2024-10-08 14:41:05', '127.0.0.1', '2024-10-08 19:41:56', 'Canada', '2024-10-01 14:41:05', 'NO', '2024-10-02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_ips`
--

CREATE TABLE `user_ips` (
  `ip_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `used_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_ips`
--

INSERT INTO `user_ips` (`ip_id`, `user_id`, `ip_address`, `used_at`) VALUES
(1, 1, '127.0.0.1', '2024-10-04 16:41:49'),
(2, 1, '127.0.0.2', '2024-10-04 16:41:49');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_issued_bonuses`
--

CREATE TABLE `user_issued_bonuses` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `issued_at` datetime NOT NULL,
  `bonus` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `strategy` varchar(255) DEFAULT 'undefined',
  `stage` enum('Active','Completed','Expired') NOT NULL,
  `amount_locked` decimal(10,2) DEFAULT '0.00',
  `wager` varchar(255) DEFAULT 'undefined',
  `expiry_date` datetime NOT NULL,
  `related_account_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_issued_bonuses`
--

INSERT INTO `user_issued_bonuses` (`id`, `user_id`, `issued_at`, `bonus`, `amount`, `strategy`, `stage`, `amount_locked`, `wager`, `expiry_date`, `related_account_id`) VALUES
(1, 1, '2024-10-17 19:47:41', 'Welcome Bonus', '100.00', 'Initial Deposit Match', 'Active', '0.00', '10x Deposit', '2024-12-31 23:59:59', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_issued_empty_bonuses`
--

CREATE TABLE `user_issued_empty_bonuses` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_issued_empty_bonuses`
--

INSERT INTO `user_issued_empty_bonuses` (`id`, `user_id`, `issued_at`) VALUES
(1, 1, '2024-10-09 20:12:41');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_issued_freespins`
--

CREATE TABLE `user_issued_freespins` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `source_type` enum('dsl','api','referral_system') NOT NULL,
  `issued_at` datetime NOT NULL,
  `freespin_bonus` varchar(255) NOT NULL,
  `strategy` enum('deposit','signup','referral') NOT NULL,
  `stage` enum('played','active','expired') NOT NULL,
  `win_amount` decimal(10,2) NOT NULL,
  `activate_until` datetime NOT NULL,
  `expiry_date` datetime NOT NULL,
  `currency` varchar(10) DEFAULT 'CAD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_issued_freespins`
--

INSERT INTO `user_issued_freespins` (`id`, `user_id`, `source_type`, `issued_at`, `freespin_bonus`, `strategy`, `stage`, `win_amount`, `activate_until`, `expiry_date`, `currency`) VALUES
(1, 1, 'api', '2024-10-01 15:37:54', 'Welcome Freespin Bonus', 'deposit', 'played', '20.47', '2024-10-08 15:37:54', '2024-10-15 15:54:22', 'CAD');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_latest_payments`
--

CREATE TABLE `user_latest_payments` (
  `payment_id` int NOT NULL,
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
  `currency` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_latest_payments`
--

INSERT INTO `user_latest_payments` (`payment_id`, `user_id`, `action`, `source`, `account`, `source_of_approval`, `manual`, `return_type`, `comments`, `sumsub_pmv`, `success`, `created_at`, `finished_at`, `amount`, `currency`) VALUES
(1, 1, 'deposit', 'Devcode - Webredirect - APM76_TRUSTLY - APM76', 'Account 1', 'Admin 1', 'no', 'instant', 'N/A', '0', 'yes', '2024-09-28 22:05:33', '2024-09-28 22:05:55', '30.00', 'EUR'),
(2, 1, 'deposit', 'Fintechub Seamless - APM37-Pay via bank', 'Account 2', 'Admin 2', 'no', 'instant', 'N/A', '0', 'no', '2024-09-28 22:04:45', '2024-09-28 22:04:46', '30.00', 'EUR'),
(3, 1, 'deposit', 'Fintechub Seamless - APM37-Pay via bank', 'Account 3', 'Admin 3', 'no', 'instant', 'N/A', '0', 'no', '2024-09-28 22:04:26', '2024-09-28 22:04:28', '30.00', 'EUR');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_locks`
--

CREATE TABLE `user_locks` (
  `lock_id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('Cs reason','Sb reason') NOT NULL,
  `comment` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_locks`
--

INSERT INTO `user_locks` (`lock_id`, `user_id`, `type`, `comment`) VALUES
(1, 1, 'Cs reason', 'ilegal program'),
(2, 1, 'Sb reason', 'Hacks');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_net_total`
--

CREATE TABLE `user_net_total` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `total_bets` decimal(10,2) NOT NULL,
  `total_wins` decimal(10,2) NOT NULL,
  `bonuses` decimal(10,2) NOT NULL,
  `net_total` decimal(10,2) NOT NULL,
  `payout_percentage` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_net_total`
--

INSERT INTO `user_net_total` (`id`, `user_id`, `currency`, `total_bets`, `total_wins`, `bonuses`, `net_total`, `payout_percentage`) VALUES
(1, 1, 'EUR', '296.60', '94.03', '102.57', '100.00', '31.70');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_payments`
--

CREATE TABLE `user_payments` (
  `payment_id` int NOT NULL,
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
  `currency` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_payments`
--

INSERT INTO `user_payments` (`payment_id`, `user_id`, `action`, `source`, `account`, `source_of_approval`, `manual`, `return_type`, `comments`, `sumsub_pmv`, `success`, `created_at`, `finished_at`, `amount`, `currency`) VALUES
(1, 1, 'deposit', 'Finteqhub - Interac®', NULL, NULL, 0, 'success', NULL, NULL, 0, '2024-10-04 17:19:53', '2024-10-04 12:19:03', '30.00', 'CAD');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_payment_accounts`
--

CREATE TABLE `user_payment_accounts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `payment_provider` varchar(255) NOT NULL,
  `payment_system` varchar(255) NOT NULL,
  `payment_platform` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

CREATE TABLE `user_payment_system_debts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `system_name` varchar(255) NOT NULL,
  `account_in_system` varchar(255) NOT NULL,
  `payment_account` varchar(255) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `debit` decimal(10,2) NOT NULL,
  `verified` enum('YES','NO') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_payment_system_debts`
--

INSERT INTO `user_payment_system_debts` (`id`, `user_id`, `created_at`, `updated_at`, `system_name`, `account_in_system`, `payment_account`, `currency`, `debit`, `verified`) VALUES
(1, 1, '2024-08-28 15:39:47', '2024-08-28 15:39:47', 'devcode:creditcard', '100018296#da695a52-09b4-49ed-a4ff-97a318a96348', '406587******7182', 'AUD', '30.00', 'NO'),
(2, 1, '2024-08-21 21:13:07', '2024-08-21 21:13:07', 'fintechhub:neosurf', 'neosurf', '406587******7182', 'AUD', '30.00', 'NO');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_phones`
--

CREATE TABLE `user_phones` (
  `phone_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `phone_type` enum('home','work','mobile') DEFAULT 'mobile',
  `verified` enum('verified','not verified') DEFAULT 'not verified',
  `status` enum('active','not active') NOT NULL DEFAULT 'not active',
  `added_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `country` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_phones`
--

INSERT INTO `user_phones` (`phone_id`, `user_id`, `phone_number`, `phone_type`, `verified`, `status`, `added_at`, `country`) VALUES
(1, 1, '+123123123', 'mobile', 'not verified', 'not active', '2024-10-04 16:43:04', 'Canada'),
(2, 1, '+231231231', 'work', 'not verified', 'not active', '2024-10-04 16:43:29', 'Canada'),
(3, 1, '+31233123', 'home', 'not verified', 'not active', '2024-10-04 16:43:29', 'Canada'),
(4, 1, '+123123123', 'mobile', 'verified', 'not active', '2024-10-08 19:33:40', 'Canada');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_sessions`
--

CREATE TABLE `user_sessions` (
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `event_date` datetime NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `ip` varchar(45) NOT NULL,
  `country` varchar(50) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `coordinates` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_sessions`
--

INSERT INTO `user_sessions` (`session_id`, `user_id`, `event_date`, `event_type`, `ip`, `country`, `address`, `coordinates`) VALUES
(1, 1, '2024-10-04 12:11:40', 'User signed in', '127.0.0.1', 'Canada', 'Edmonton, T5Y Alberta Canada', '53.655, -113.3784'),
(2, 1, '2024-10-08 14:45:08', 'User sign out', '127.0.0.1', 'Canada', 'Edmonton, T5Y Alberta Canada', '53.655, -113.3784'),
(3, 1, '2024-10-08 14:45:08', 'User used new ip', '127.0.0.2', 'Canada', 'Edmonton, T5Y Alberta Canada', '53.655, -113.3784');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_stag_assignment`
--

CREATE TABLE `user_stag_assignment` (
  `assignment_id` int NOT NULL,
  `user_id` int NOT NULL,
  `affiliate_url` varchar(255) NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_stag_assignment`
--

INSERT INTO `user_stag_assignment` (`assignment_id`, `user_id`, `affiliate_url`, `assigned_at`) VALUES
(1, 1, 'https://affiliate.example.com/stag-12345', '2024-10-09 20:09:42');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_suspicions`
--

CREATE TABLE `user_suspicions` (
  `suspicion_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `failed_check_comment` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_suspicions`
--

INSERT INTO `user_suspicions` (`suspicion_id`, `user_id`, `created_at`, `failed_check_comment`) VALUES
(1, 1, '2024-10-08 16:25:21', 'User has debt to another payment system');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_tags`
--

CREATE TABLE `user_tags` (
  `user_id` int NOT NULL,
  `tag_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_tags`
--

INSERT INTO `user_tags` (`user_id`, `tag_id`) VALUES
(1, 1),
(1, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_tags_list`
--

CREATE TABLE `user_tags_list` (
  `tag_id` int NOT NULL,
  `tag_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

CREATE TABLE `user_tournament_participation` (
  `participation_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `tournament_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `tournament_bets` decimal(10,2) DEFAULT NULL,
  `points` decimal(10,2) DEFAULT NULL,
  `game_category` varchar(50) DEFAULT NULL,
  `award_place` int DEFAULT NULL,
  `confirmation_required` enum('applied','not applied') DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_tournament_participation`
--

INSERT INTO `user_tournament_participation` (`participation_id`, `user_id`, `tournament_id`, `currency`, `tournament_bets`, `points`, `game_category`, `award_place`, `confirmation_required`, `end_at`, `created_at`) VALUES
(5, 1, 15, 'EUR', '424.00', '424.00', 'slots', 213, 'not applied', '2030-05-20 14:18:00', '2024-10-09 17:56:45'),
(6, 1, 41, 'EUR', '424.00', '424.00', 'slots', 10, 'not applied', '2024-08-26 16:00:00', '2024-10-09 17:56:45');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_used_addresses`
--

CREATE TABLE `user_used_addresses` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `crypto_address` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `user_used_addresses`
--

INSERT INTO `user_used_addresses` (`id`, `user_id`, `currency`, `crypto_address`) VALUES
(1, 1, 'CAD-USDT', '0xff8D525C5ab8ac6346A61fCae24D869eF00C195b'),
(2, 1, 'CAD-USDT', 'TTiYyy562kpGecM2A2kZs6Gj4JhVajXc8T'),
(3, 1, 'CAD-USDT', '0xaaC7697873991E4dcc280ED606d2610C4BD2569B');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `adminsKeys`
--
ALTER TABLE `adminsKeys`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `admins_sessions`
--
ALTER TABLE `admins_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  ADD PRIMARY KEY (`log_id`);

--
-- Indices de la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indices de la tabla `bets`
--
ALTER TABLE `bets`
  ADD PRIMARY KEY (`bet_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `login_history`
--
ALTER TABLE `login_history`
  ADD PRIMARY KEY (`login_history_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `reports_suspicious`
--
ALTER TABLE `reports_suspicious`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indices de la tabla `revenue`
--
ALTER TABLE `revenue`
  ADD PRIMARY KEY (`revenue_id`);

--
-- Indices de la tabla `ServerLogs`
--
ALTER TABLE `ServerLogs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `tournaments`
--
ALTER TABLE `tournaments`
  ADD PRIMARY KEY (`tournament_id`);

--
-- Indices de la tabla `tournament_allowed_currencies`
--
ALTER TABLE `tournament_allowed_currencies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tournament_id` (`tournament_id`);

--
-- Indices de la tabla `tournament_individual_prizes`
--
ALTER TABLE `tournament_individual_prizes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tournament_id` (`tournament_id`);

--
-- Indices de la tabla `tournament_prize_pool`
--
ALTER TABLE `tournament_prize_pool`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tournament_id` (`tournament_id`);

--
-- Indices de la tabla `tournament_top_players`
--
ALTER TABLE `tournament_top_players`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tournament_id` (`tournament_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `transaction_history`
--
ALTER TABLE `transaction_history`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `users_activity_logs`
--
ALTER TABLE `users_activity_logs`
  ADD PRIMARY KEY (`log_id`);

--
-- Indices de la tabla `user_accounts`
--
ALTER TABLE `user_accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD KEY `fk_user` (`user_id`);

--
-- Indices de la tabla `user_ad_args`
--
ALTER TABLE `user_ad_args`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_affiliates`
--
ALTER TABLE `user_affiliates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `affiliate_id` (`affiliate_id`);

--
-- Indices de la tabla `user_affiliate_profiles`
--
ALTER TABLE `user_affiliate_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `affiliate_id` (`affiliate_id`);

--
-- Indices de la tabla `user_balances`
--
ALTER TABLE `user_balances`
  ADD PRIMARY KEY (`balance_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_bin_info`
--
ALTER TABLE `user_bin_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_comments`
--
ALTER TABLE `user_comments`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_details`
--
ALTER TABLE `user_details`
  ADD PRIMARY KEY (`user_details_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_documents`
--
ALTER TABLE `user_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_duplications`
--
ALTER TABLE `user_duplications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `duplicated_user_id` (`duplicated_user_id`);

--
-- Indices de la tabla `user_extra_info`
--
ALTER TABLE `user_extra_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_groups`
--
ALTER TABLE `user_groups`
  ADD PRIMARY KEY (`user_id`,`group_id`),
  ADD KEY `group_id` (`group_id`);

--
-- Indices de la tabla `user_groups_list`
--
ALTER TABLE `user_groups_list`
  ADD PRIMARY KEY (`group_id`),
  ADD UNIQUE KEY `group_name` (`group_name`);

--
-- Indices de la tabla `user_info`
--
ALTER TABLE `user_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_ips`
--
ALTER TABLE `user_ips`
  ADD PRIMARY KEY (`ip_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_issued_bonuses`
--
ALTER TABLE `user_issued_bonuses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `related_account_id` (`related_account_id`);

--
-- Indices de la tabla `user_issued_empty_bonuses`
--
ALTER TABLE `user_issued_empty_bonuses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_issued_freespins`
--
ALTER TABLE `user_issued_freespins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_latest_payments`
--
ALTER TABLE `user_latest_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_locks`
--
ALTER TABLE `user_locks`
  ADD PRIMARY KEY (`lock_id`),
  ADD KEY `fk_user_id` (`user_id`);

--
-- Indices de la tabla `user_net_total`
--
ALTER TABLE `user_net_total`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_payments`
--
ALTER TABLE `user_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_payment_accounts`
--
ALTER TABLE `user_payment_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_payment_system_debts`
--
ALTER TABLE `user_payment_system_debts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_phones`
--
ALTER TABLE `user_phones`
  ADD PRIMARY KEY (`phone_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_stag_assignment`
--
ALTER TABLE `user_stag_assignment`
  ADD PRIMARY KEY (`assignment_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_suspicions`
--
ALTER TABLE `user_suspicions`
  ADD PRIMARY KEY (`suspicion_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_tags`
--
ALTER TABLE `user_tags`
  ADD PRIMARY KEY (`user_id`,`tag_id`),
  ADD KEY `tag_id` (`tag_id`);

--
-- Indices de la tabla `user_tags_list`
--
ALTER TABLE `user_tags_list`
  ADD PRIMARY KEY (`tag_id`),
  ADD UNIQUE KEY `tag_name` (`tag_name`);

--
-- Indices de la tabla `user_tournament_participation`
--
ALTER TABLE `user_tournament_participation`
  ADD PRIMARY KEY (`participation_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `tournament_id` (`tournament_id`);

--
-- Indices de la tabla `user_used_addresses`
--
ALTER TABLE `user_used_addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `admins`
--
ALTER TABLE `admins`
  MODIFY `admin_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `adminsKeys`
--
ALTER TABLE `adminsKeys`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `admins_sessions`
--
ALTER TABLE `admins_sessions`
  MODIFY `session_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  MODIFY `log_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `bets`
--
ALTER TABLE `bets`
  MODIFY `bet_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `login_history`
--
ALTER TABLE `login_history`
  MODIFY `login_history_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reports_suspicious`
--
ALTER TABLE `reports_suspicious`
  MODIFY `report_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `revenue`
--
ALTER TABLE `revenue`
  MODIFY `revenue_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ServerLogs`
--
ALTER TABLE `ServerLogs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `tournaments`
--
ALTER TABLE `tournaments`
  MODIFY `tournament_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT de la tabla `tournament_allowed_currencies`
--
ALTER TABLE `tournament_allowed_currencies`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `tournament_individual_prizes`
--
ALTER TABLE `tournament_individual_prizes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `tournament_prize_pool`
--
ALTER TABLE `tournament_prize_pool`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `tournament_top_players`
--
ALTER TABLE `tournament_top_players`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `transaction_history`
--
ALTER TABLE `transaction_history`
  MODIFY `transaction_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `users_activity_logs`
--
ALTER TABLE `users_activity_logs`
  MODIFY `log_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_accounts`
--
ALTER TABLE `user_accounts`
  MODIFY `account_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `user_ad_args`
--
ALTER TABLE `user_ad_args`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_affiliates`
--
ALTER TABLE `user_affiliates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_affiliate_profiles`
--
ALTER TABLE `user_affiliate_profiles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_balances`
--
ALTER TABLE `user_balances`
  MODIFY `balance_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `user_bin_info`
--
ALTER TABLE `user_bin_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_comments`
--
ALTER TABLE `user_comments`
  MODIFY `comment_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `user_details`
--
ALTER TABLE `user_details`
  MODIFY `user_details_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_documents`
--
ALTER TABLE `user_documents`
  MODIFY `document_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `user_duplications`
--
ALTER TABLE `user_duplications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_extra_info`
--
ALTER TABLE `user_extra_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_groups_list`
--
ALTER TABLE `user_groups_list`
  MODIFY `group_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `user_info`
--
ALTER TABLE `user_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_ips`
--
ALTER TABLE `user_ips`
  MODIFY `ip_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `user_issued_bonuses`
--
ALTER TABLE `user_issued_bonuses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_issued_empty_bonuses`
--
ALTER TABLE `user_issued_empty_bonuses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_issued_freespins`
--
ALTER TABLE `user_issued_freespins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_latest_payments`
--
ALTER TABLE `user_latest_payments`
  MODIFY `payment_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `user_locks`
--
ALTER TABLE `user_locks`
  MODIFY `lock_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `user_net_total`
--
ALTER TABLE `user_net_total`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_payments`
--
ALTER TABLE `user_payments`
  MODIFY `payment_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_payment_accounts`
--
ALTER TABLE `user_payment_accounts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `user_payment_system_debts`
--
ALTER TABLE `user_payment_system_debts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `user_phones`
--
ALTER TABLE `user_phones`
  MODIFY `phone_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `session_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `user_stag_assignment`
--
ALTER TABLE `user_stag_assignment`
  MODIFY `assignment_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `user_suspicions`
--
ALTER TABLE `user_suspicions`
  MODIFY `suspicion_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `user_tags_list`
--
ALTER TABLE `user_tags_list`
  MODIFY `tag_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `user_tournament_participation`
--
ALTER TABLE `user_tournament_participation`
  MODIFY `participation_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `user_used_addresses`
--
ALTER TABLE `user_used_addresses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

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
-- Filtros para la tabla `user_comments`
--
ALTER TABLE `user_comments`
  ADD CONSTRAINT `user_comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

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
-- Filtros para la tabla `user_duplications`
--
ALTER TABLE `user_duplications`
  ADD CONSTRAINT `user_duplications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_duplications_ibfk_2` FOREIGN KEY (`duplicated_user_id`) REFERENCES `users` (`user_id`);

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
-- Filtros para la tabla `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

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

--
-- Filtros para la tabla `user_used_addresses`
--
ALTER TABLE `user_used_addresses`
  ADD CONSTRAINT `user_used_addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
