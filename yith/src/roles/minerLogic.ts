//import Util from "util/Util";
//import Action from "util/Action";
//import getAll from 'getAll';
//import SpawnRequest from '../SpawnRequest';
//
//export default {
//	run: function(creep: Creep) {
//		console.log('run() miner');
//
//		let creepEnergy = creep.carry.energy || 0;
//		let mem = creep.memory;
//		let origMemHarvesting = mem.harvesting;
//
//		if (mem.harvesting) {
//			let container: Container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
//				filter: (structure: Structure) => {
//					if (structure.structureType == STRUCTURE_CONTAINER) {
//						return (<Container>structure).store >= 0;
//					} else {
//						return false;
//					}
//				}
//			});
//			let source: Source = creep.pos.findClosestByPath(FIND_SOURCES, {
//				filter: (source: Source) => source.energy >= 0
//			});
//
//			if (container) {
//				Action.collect(creep, container);
//			} else if (source) {
//				Action.harvest(creep, source);
//			} else if (creepEnergy > 0) {
//				mem.harvesting = false;
//			}
//
//			if (creepEnergy >= creep.carryCapacity) {
//				mem.harvesting = false;
//			}
//		} else {
//			let target: Container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
//				filter: (structure: Structure) => {
//					return (structure.structureType == STRUCTURE_EXTENSION
//							|| structure.structureType == STRUCTURE_SPAWN
//						) &&
//						(<Extension|Spawn>structure).energy < (<Extension|Spawn>structure).energyCapacity;
//				}
//			});
//
//			target = target || creep.room.controller;
//
//			if (target) {
//				Action.deliver(creep, target);
//			} else {
//				let idleFlag: Flag|{} = creep.room.find(FIND_FLAGS, {
//					filter: (flag: Flag) => flag.name == 'Idle1'
//				})[0];
//				if (idleFlag instanceof Flag) {
//					creep.say('moveTo Idle');
//					creep.moveTo(idleFlag, {visualizePathStyle: {stroke: '#ff0000'}})
//				}
//			}
//
//			if (creepEnergy <= 0) {
//				mem.harvesting = true;
//			}
//		}
//
//		if (mem.harvesting != origMemHarvesting) {
//			if (mem.harvesting) creep.say('harvest');
//			else creep.say('deliver');
//		}
//	},
//	generateSpawnRequest: function(room: Room): SpawnRequest {
//		let all = getAll();
//
//		let creepsInRoom = all.creeps
//			.filter((creep: Creep) => creep.room.name == room.name);
//		let countByRole: {[role: string]: number} = Util.countByRole(creepsInRoom);
//		let requestSpawn = (countByRole['harvester'] || 0) < 2
//			&& (
//				(countByRole['miner'] || 0) < 1
//				|| (countByRole['carrier'] || 0) < 1
//			);
//
//		if (requestSpawn) {
//			return {
//				priority: 8,
//				generateBody: (): string[] => {
//					return [WORK, CARRY, MOVE, MOVE];
//				},
//				memory: {role: 'harvester'}
//			};
//		} else {
//			return {
//				priority: 0,
//				generateBody: () => [],
//				memory: {role: 'none'}
//			};
//		}
//
//	}
//};