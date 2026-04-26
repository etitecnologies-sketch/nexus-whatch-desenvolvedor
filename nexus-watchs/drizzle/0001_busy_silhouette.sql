CREATE TABLE `cameras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`channelNumber` int NOT NULL,
	`rtspUrl` varchar(500),
	`resolution` enum('sd','hd','fullhd','4k') NOT NULL DEFAULT 'hd',
	`isPtzEnabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cameras_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('dvr','nvr','ip_camera') NOT NULL,
	`connectionType` enum('ip','ddns','p2p','qrcode') NOT NULL,
	`ipAddress` varchar(45),
	`ddnsAddress` varchar(255),
	`p2pId` varchar(255),
	`username` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`port` int DEFAULT 8000,
	`status` enum('online','offline','error') NOT NULL DEFAULT 'offline',
	`latency` int,
	`lastSeen` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favoriteCameras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`favoriteId` int NOT NULL,
	`cameraId` int NOT NULL,
	`order` int DEFAULT 0,
	CONSTRAINT `favoriteCameras_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`color` varchar(50),
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` int,
	`cameraId` int,
	`type` enum('motion_detection','alarm','device_offline','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ptzPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cameraId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`panPosition` int,
	`tiltPosition` int,
	`zoomLevel` int,
	`presetNumber` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ptzPresets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videoRecordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cameraId` int NOT NULL,
	`filename` varchar(500) NOT NULL,
	`fileSize` int,
	`duration` int,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`storageKey` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videoRecordings_id` PRIMARY KEY(`id`)
);
