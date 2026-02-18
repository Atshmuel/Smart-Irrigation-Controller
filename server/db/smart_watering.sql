CREATE DATABASE IF NOT EXISTS smart_pot;

USE smart_pot;

CREATE TABLE IF NOT EXISTS `species` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`type` varchar(255) NOT NULL,
	`instructions` varchar(1000) NOT NULL
);

CREATE TABLE IF NOT EXISTS `pots` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`type_id` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`date` date NOT NULL,
	`status` boolean NOT NULL DEFAULT 0, -- off=0,on=1
	`mode` ENUM('weather', 'moisture', 'manual', 'scheduled') DEFAULT 'manual',
	CONSTRAINT `pots_fk_species` FOREIGN KEY (`type_id`) REFERENCES `species`(`id`)
);

CREATE TABLE IF NOT EXISTS `watering_events` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `pot_id` int NOT NULL,
    `start_time` datetime NOT NULL,
    `end_time` datetime DEFAULT NULL,
    `duration_seconds` int DEFAULT 0,
    `water_consumed_liters` float DEFAULT 0,
    CONSTRAINT `fk_event_pot` FOREIGN KEY (`pot_id`) REFERENCES `pots`(`id`)
);

CREATE TABLE IF NOT EXISTS `logs` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `pot_id` int NOT NULL,
    `temperature` float NOT NULL,
    `humidity` float NOT NULL,
    `soil_moisture` int NOT NULL,
    `light_level` int NOT NULL,
    `current_mode` varchar(50) NOT NULL,
    CONSTRAINT `fk_log` FOREIGN KEY (`pot_id`) REFERENCES `pots`(`id`)
);


CREATE TABLE IF NOT EXISTS `sensors` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`pot_id` int NOT NULL,
	`name` varchar(50) NOT NULL, 
	`value` float NOT NULL,
	`date` date NOT NULL,
	`time` time NOT NULL,
	CONSTRAINT `sensors_fk_pot` FOREIGN KEY (`pot_id`) REFERENCES `pots`(`id`)
);

CREATE TABLE IF NOT EXISTS `pot_schedules` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`pot_id` int NOT NULL,
	`start_hour` int NOT NULL,
	`start_minute` int NOT NULL,
	`end_hour` int NOT NULL,
	`end_minute` int NOT NULL,
	`days` varchar(255) NOT NULL, 
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_fk_pot` FOREIGN KEY (`pot_id`) REFERENCES `pots`(`id`)
);