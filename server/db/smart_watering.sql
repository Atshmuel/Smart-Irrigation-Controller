CREATE TABLE IF NOT EXISTS `species` (
	`id` int AUTO_INCREMENT NOT NULL UNIQUE,
	`type` varchar(255) NOT NULL,
	`instructions` varchar(1000) NOT NULL,
	PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `water_tracking` (
	`id` int AUTO_INCREMENT NOT NULL UNIQUE,
	`date` date NOT NULL,
	`time` time NOT NULL,
	`count` int NOT NULL,
	`pot` int NOT NULL,
	PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `pots` (
	`id` int AUTO_INCREMENT NOT NULL UNIQUE,
	`type_id` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`date` date NOT NULL,
	`status` boolean NOT NULL,
	PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `sensors` (
	`id` int AUTO_INCREMENT NOT NULL UNIQUE,
	`name` varchar(50) NOT NULL,
	`average` float NOT NULL,
	`date` date NOT NULL,
	`pot_id` int NOT NULL,
	PRIMARY KEY (`id`)
);



ALTER TABLE `pots` ADD CONSTRAINT `pots_fk0` FOREIGN KEY (`id`) REFERENCES `water_tracking`(`pot`);

ALTER TABLE `pots` ADD CONSTRAINT `pots_fk1` FOREIGN KEY (`type_id`) REFERENCES `species`(`id`);
ALTER TABLE `sensors` ADD CONSTRAINT `sensors_fk4` FOREIGN KEY (`pot_id`) REFERENCES `pots`(`id`);