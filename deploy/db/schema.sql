-- =====================================================
-- deploy/db/schema.sql
-- ⚠️ 데이터 볼륨이 비어 있을 때 딱 한 번만 실행된다.
--    이미 초기화된 DB에는 이 파일을 고쳐도 반영되지 않으므로
--    손으로 ALTER TABLE 을 쳐야 한다.
--
-- 언어 코드 표기: 대문자 2글자 ('KO', 'EN', 'JA', 'ZH')
--   users.language 와 edge_translations.language_code 는
--   반드시 같은 표기를 사용해야 함 (조회 시 직접 매칭됨)
-- =====================================================

-- -----------------------------------------------------
-- 역
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stations` (
    `station_id` BIGINT       NOT NULL AUTO_INCREMENT COMMENT '역 번호',
    `name_ko`    VARCHAR(100) NOT NULL                COMMENT '역 한글명',
    `name_en`    VARCHAR(100) NOT NULL                COMMENT '역 영문명',
    `region`     VARCHAR(50)  NOT NULL                COMMENT '역 지역',
    PRIMARY KEY (`station_id`),
    KEY `idx_stations_name_ko` (`name_ko`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='역';


-- -----------------------------------------------------
-- 사용자
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `user_id`       BIGINT       NOT NULL AUTO_INCREMENT COMMENT '고객 번호',
    `email`         VARCHAR(255) NOT NULL                COMMENT '고객 이메일',
    `password_hash` VARCHAR(255) NULL                    COMMENT '고객 암호화 비밀번호 (소셜 가입 시 NULL)',
    `provider`      VARCHAR(20)  NOT NULL DEFAULT 'LOCAL' COMMENT '가입 경로 (LOCAL/GOOGLE/KAKAO/NAVER)',
    `provider_id`   VARCHAR(100) NULL                    COMMENT '소셜 고유 식별자 (로컬 가입 시 NULL)',
    `language`      VARCHAR(10)  NOT NULL DEFAULT 'EN'   COMMENT '고객 선호 언어 (KO/EN/JA/ZH)',
    `created_at`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '고객 가입일자',
    `deleted_at`    DATETIME(6)  NULL                    COMMENT '고객 탈퇴일자',
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `uk_users_email`    (`email`),
    UNIQUE KEY `uk_users_provider` (`provider`, `provider_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자';


-- -----------------------------------------------------
-- 역무원
-- 역 1개당 계정 1개 전제 → station_id 에 UNIQUE
-- (StaffRepository.findByStationId 가 Optional 을 반환하므로
--  중복이 생기면 상담 요청이 NonUniqueResultException 500 이 된다)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `staffs` (
    `staff_id`      BIGINT       NOT NULL AUTO_INCREMENT COMMENT '역무원 번호',
    `station_id`    BIGINT       NOT NULL                COMMENT '역 번호',
    `staff_code`    VARCHAR(255) NOT NULL                COMMENT '역무원 코드 (로그인 ID)',
    `password_hash` VARCHAR(255) NOT NULL                COMMENT '암호화 비밀번호',
    `created_at`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '역무원 가입 일자',
    PRIMARY KEY (`staff_id`),
    UNIQUE KEY `uk_staffs_code`    (`staff_code`),
    UNIQUE KEY `uk_staffs_station` (`station_id`),
    CONSTRAINT `fk_staffs_station`
    FOREIGN KEY (`station_id`) REFERENCES `stations` (`station_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='역무원';


-- -----------------------------------------------------
-- 포인트
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `points` (
    `point_id`   BIGINT      NOT NULL AUTO_INCREMENT COMMENT '포인트 번호',
    `station_id` BIGINT      NOT NULL                COMMENT '역 번호',
    `point_code` VARCHAR(20) NOT NULL                COMMENT '포인트 코드',
    `type`       VARCHAR(20) NOT NULL                COMMENT '포인트 타입',
    `floor`      INT         NOT NULL                COMMENT '포인트 층',
    PRIMARY KEY (`point_id`),
    KEY `idx_points_station` (`station_id`),
    CONSTRAINT `fk_points_station`
    FOREIGN KEY (`station_id`) REFERENCES `stations` (`station_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='포인트';


-- -----------------------------------------------------
-- 엣지
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `edges` (
   `edge_id`       BIGINT         NOT NULL AUTO_INCREMENT COMMENT '엣지 번호',
   `from_point_id` BIGINT         NOT NULL                COMMENT '시작포인트 번호',
   `to_point_id`   BIGINT         NOT NULL                COMMENT '도착포인트 번호',
   `edge_code`     VARCHAR(20)    NOT NULL                COMMENT '엣지 코드',
    `weight`        DECIMAL(10, 2) NOT NULL                COMMENT '가중치',
    `photo_s3`      VARCHAR(500)   NULL                    COMMENT 'S3 이미지 경로',
    `use_stair`     BOOLEAN        NOT NULL DEFAULT FALSE  COMMENT '계단 여부',
    PRIMARY KEY (`edge_id`),
    KEY `idx_edges_from` (`from_point_id`),
    KEY `idx_edges_to`   (`to_point_id`),
    CONSTRAINT `fk_edges_from_point`
    FOREIGN KEY (`from_point_id`) REFERENCES `points` (`point_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_edges_to_point`
    FOREIGN KEY (`to_point_id`) REFERENCES `points` (`point_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='엣지';


-- -----------------------------------------------------
-- 엣지 번역
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `edge_translations` (
   `translation_id` BIGINT       NOT NULL AUTO_INCREMENT COMMENT '번역 번호',
   `edge_id`        BIGINT       NOT NULL                COMMENT '엣지 번호',
   `language_code`  VARCHAR(10)  NOT NULL                COMMENT '언어 코드 (KO/EN/JA/ZH)',
    `instruction`    VARCHAR(500) NULL                    COMMENT '설명',
    PRIMARY KEY (`translation_id`),
    UNIQUE KEY `uk_edge_translations_edge_lang` (`edge_id`, `language_code`),
    CONSTRAINT `fk_edge_translations_edge`
    FOREIGN KEY (`edge_id`) REFERENCES `edges` (`edge_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='엣지 번역';


-- -----------------------------------------------------
-- 블랙리스트
-- reason 은 사유 여러 개를 쉼표로 이어 저장 (예: 'ABUSE,SPAM')
-- 활성 여부는 released_at IS NULL 로 판단하며,
-- MySQL 이 조건부 UNIQUE 를 지원하지 않아 중복은 서비스에서 막는다
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `blacklists` (
    `blacklist_id`  BIGINT       NOT NULL AUTO_INCREMENT COMMENT '블랙리스트 번호',
    `user_id`       BIGINT       NOT NULL                COMMENT '고객 번호',
    `staff_id`      BIGINT       NOT NULL                COMMENT '역무원 번호',
    `reason`        VARCHAR(255) NULL                    COMMENT '블랙리스트 사유 (쉼표 구분)',
    `registered_at` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '블랙리스트 등록 시간',
    `released_at`   DATETIME(6)  NULL                    COMMENT '블랙리스트 해제 시간',
    PRIMARY KEY (`blacklist_id`),
    KEY `idx_blacklists_user`  (`user_id`, `released_at`),
    KEY `idx_blacklists_staff` (`staff_id`),
    CONSTRAINT `fk_blacklists_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_blacklists_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `staffs` (`staff_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='블랙리스트';


-- -----------------------------------------------------
-- 상담
-- ssabway(요청 생성) 와 ssabway_webrtc(세션 생명주기) 가 공유하는 테이블
--   ssabway : INSERT 시 status='WAITING' 을 박고 이후 status 를 건드리지 않음
--   webrtc  : WAITING → IN_PROGRESS → ENDED 전이, 녹취·요약 UPDATE
-- departure/destination 은 사용자 자유 입력이라 FK 로 묶지 않는다
-- ⚠️ summary 가 VARCHAR(255) 이므로 AI 요약이 255자를 넘으면 UPDATE 가 실패한다
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `consultations` (
   `consultation_id`   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '상담 번호',
   `requester_user_id` BIGINT       NOT NULL                COMMENT '고객 번호',
   `staff_id`          BIGINT       NOT NULL                COMMENT '역무원 번호',
   `departure`         VARCHAR(255) NOT NULL                COMMENT '출발지 (사용자 자유 입력)',
    `destination`       VARCHAR(255) NOT NULL                COMMENT '도착지 (사용자 자유 입력)',
    `status`            VARCHAR(20)  NOT NULL DEFAULT 'WAITING' COMMENT '상담 상태 (WAITING/IN_PROGRESS/ENDED/CANCELED)',
    `started_at`        DATETIME(6)  NULL                    COMMENT '상담 시작 시간',
    `ended_at`          DATETIME(6)  NULL                    COMMENT '상담 종료 시간',
    `requested_at`      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '상담 요청 시간',
    `record_id`         VARCHAR(255) NULL                    COMMENT '상담 녹취 ID',
    `record_s3`         VARCHAR(500) NULL                    COMMENT '상담 녹취 S3 경로',
    `summary`           VARCHAR(255) NULL                    COMMENT '상담 요약',
    PRIMARY KEY (`consultation_id`),
    KEY `idx_consultations_user`  (`requester_user_id`),
    KEY `idx_consultations_staff` (`staff_id`, `status`),
    CONSTRAINT `fk_consultations_user`
    FOREIGN KEY (`requester_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_consultations_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `staffs` (`staff_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상담';