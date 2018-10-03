import SpawnRequest from 'SpawnRequest';
import Log from 'util/Log';
import All from "All";
import Timer from "util/Timer";

export default class BuySellLogic {
	static onTick() {
		if (Game.time % 10 != 0) return;

		Timer.start("BuySellLogic.onTick()");

		if (!Memory['mainTerminalId']) {
			const room = All.rooms().filter(r => !!r.terminal)[0];
			if (room && room.terminal) {
				Memory['mainTerminalId'] = room.terminal.id;
			}
		}

		interface DecoratedEnergyOrder {
			id: string,
			grossAmount: number,
			netAmount: number,
			realUnitPrice: number
		}

		interface DecoratedResourceOrder {
			id: string,
			amount: number,
			unitPriceWithoutEnergy: number,
			unitPriceWithEnergy: number
			energyCost: number,
		}

		interface EnergyPlan {
			orders: {
				id: string,
				amount: number
			}[],
			netAmount: number,
			realPrice: number
		}

		interface ResourcePlan {
			resourceType: string,
			orders: {
				id: string,
				amount: number
			}[],
			amount: number,
			priceWithoutEnergy: number,
			energyCost: number
		}

		const cache: {
			energyBuyOrdersSortedByRealUnitPrice?: DecoratedEnergyOrder[],
			energySellOrdersSortedByRealUnitPrice?: DecoratedEnergyOrder[],
			resourceBuyOrdersSortedByUnitPrice: {[resourceType: string]: DecoratedResourceOrder[]},
			resourceSellOrdersSortedByUnitPrice: {[resourceType: string]: DecoratedResourceOrder[]}
		} = {
			resourceBuyOrdersSortedByUnitPrice: {},
			resourceSellOrdersSortedByUnitPrice: {}
		};

		const terminal: Terminal|null = Game.getObjectById(Memory['mainTerminalId']);
		if (terminal) {
			const terminalRoom = terminal.room;

			//set terminalSpace
			let terminalStoreUsed = 0;
			RESOURCES_ALL.forEach(resourceType => {
				terminalStoreUsed += terminal.store[resourceType] || 0;
			});
			const terminalSpace = terminal.storeCapacity - terminalStoreUsed;





			terminalRoom.memory['resourceIndex'] = terminalRoom.memory['resourceIndex'] || 0;
			const resourceType = RESOURCES_ALL[terminalRoom.memory['resourceIndex']];
			let profit = 0;
			if (resourceType === RESOURCE_ENERGY) {
				const energyOutPlan = makeEnergyOutPlan(terminalSpace, 1);
				const energyInPlan = makeEnergyInPlan(energyOutPlan.netAmount, 9);
				profit = energyOutPlan.realPrice - energyInPlan.realPrice;
				if (profit > 0) {
					executePlan(energyInPlan);
					executePlan(energyOutPlan);
					Log.log("Buy: " + energyInPlan.netAmount + "@" + format(energyInPlan.realPrice/energyInPlan.netAmount, 5) + " = $" + format(energyInPlan.realPrice));
					Log.log("Sell: " + energyOutPlan.netAmount + "@" + format(energyOutPlan.realPrice/energyOutPlan.netAmount, 5) + " = $" + format(energyOutPlan.realPrice));
					Log.log("Profit: $" + format(profit) + " on " + resourceType);
				} else {
					Log.log("Profit: $" + format(profit) + " on " + resourceType + " so not flipping.");
				}
			} else {
				const energyInPlan = makeEnergyInPlan(terminalSpace, 8);
				if (energyInPlan.netAmount > 0) {
					const creditsPerEnergyEstimate = energyInPlan.realPrice / energyInPlan.netAmount;
					profit = tryToFlip(resourceType, terminal, creditsPerEnergyEstimate);
				}
			}
			if (profit <= 0) {
				terminalRoom.memory['resourceIndex'] = (terminalRoom.memory['resourceIndex'] + 1) % RESOURCES_ALL.length;


				//TODO: between flip ticks, sell everything in terminal (except a little energy)
				//	in case some part of flip fails due to another player filling the order instead of me

				const extraEnergy = terminal.store[RESOURCE_ENERGY] - terminal.storeCapacity / 3;
				if (extraEnergy > 0) {
					const energyOutPlan = makeEnergyOutPlan(extraEnergy, 10);
					executePlan(energyOutPlan);
					Log.log("Sell extra energy: " + energyOutPlan.netAmount + "@" + format(energyOutPlan.realPrice/energyOutPlan.netAmount, 5) + " = $" + format(energyOutPlan.realPrice));
				}
			}



			function tryToFlip(resourceType: string, terminal: Terminal, creditsPerEnergyEstimate: number): number {
				const ambitiousResourceOutPlan = makeResourceOutPlan(resourceType, terminalSpace, 1, creditsPerEnergyEstimate);
				const ambitiousResourceInPlan = makeResourceInPlan(resourceType, ambitiousResourceOutPlan.amount, 1, creditsPerEnergyEstimate);
				const ambitiousEnergyCost = ambitiousResourceInPlan.energyCost + ambitiousResourceOutPlan.energyCost;
				const ambitiousProfit = ambitiousResourceOutPlan.priceWithoutEnergy
					- ambitiousResourceInPlan.priceWithoutEnergy
					- ambitiousEnergyCost * creditsPerEnergyEstimate;
				if (ambitiousProfit > 0) {
					//remake plans (leaving space for the energy needed this time and limiting Out.amount to available In.amount)
					const amountToFlip = Math.min(terminalSpace - ambitiousEnergyCost, ambitiousResourceInPlan.amount);
					const resourceOutPlan = makeResourceOutPlan(resourceType, amountToFlip, 1, creditsPerEnergyEstimate);
					const resourceInPlan = makeResourceInPlan(resourceType, resourceOutPlan.amount, 1, creditsPerEnergyEstimate);
					const energyUsed = resourceInPlan.energyCost + resourceOutPlan.energyCost;
					const energyToBuy = Math.max(0, energyUsed - terminal.store[RESOURCE_ENERGY]);
					const energyInPlan = makeEnergyInPlan(energyToBuy, 8);
					const energyOnHandUsed = energyUsed - energyInPlan.netAmount;
					const profit = resourceOutPlan.priceWithoutEnergy
						- resourceInPlan.priceWithoutEnergy
						- energyInPlan.realPrice
						- energyOnHandUsed * creditsPerEnergyEstimate;
					if (profit > 0 && energyInPlan.netAmount >= energyToBuy) {
						//execute
						executePlan(energyInPlan);
						executePlan(resourceInPlan);
						executePlan(resourceOutPlan);
						Log.log("Energy: " + format(energyUsed) + "@" + format(creditsPerEnergyEstimate, 5) + " = $" + format(energyUsed*creditsPerEnergyEstimate) + " (" + format(energyInPlan.netAmount) + " of it purchased)");
						Log.log("Buy: " + resourceInPlan.amount + "@" + format(resourceInPlan.priceWithoutEnergy/resourceInPlan.amount, 5) + " = $" + format(resourceInPlan.priceWithoutEnergy));
						Log.log("Sell: " + resourceOutPlan.amount + "@" + format(resourceOutPlan.priceWithoutEnergy/resourceOutPlan.amount, 5) + " = $" + format(resourceOutPlan.priceWithoutEnergy));
						Log.log("Profit: $" + format(profit) + " on " + resourceType);

						return profit;
					} else {
						Log.log("Profit: $" + format(profit) + " on " + resourceType + " so not flipping.");
						return profit;
					}
				} else {
					Log.log("Profit: $" + format(ambitiousProfit) + " on " + resourceType + " so not flipping.");
					return profit;
				}
			}

			function format(n: number, precision?: number) {
				return n.toFixed(precision || 2).replace(/\.(\d*?)0+$/,".$1").replace(/\.$/, "");
			}

			function executePlan(plan: EnergyPlan|ResourcePlan) {
				Log.log("Not executing plan orders " + plan.orders.length);
				//TODO: fix bug where only first deal goes through (or at least I think that's the issue)
				// plan.orders.forEach(order => {
				// 	Game.market.deal(order.id, order.amount, terminalRoom.name);
				// });
			}

			function getEnergyBuyOrdersSortedByRealUnitPrice(): DecoratedEnergyOrder[] {
				//ensure cache.energyBuyOrdersSortedByRealUnitPrice exists
				if (!cache.energyBuyOrdersSortedByRealUnitPrice) {
					const energyBuyOrdersRawAll = Game.market.getAllOrders({type: ORDER_BUY, resourceType: RESOURCE_ENERGY});
					const energyBuyOrdersRaw = (energyBuyOrdersRawAll.length <= 100)
						? energyBuyOrdersRawAll
						: energyBuyOrdersRawAll.sort((a, b) => b.price - a.price).slice(0, 100); //first 100 sorted for highest price

					//fill energyBuyOrders
					const energyBuyOrders: DecoratedEnergyOrder[] = [];
					energyBuyOrdersRaw.forEach(rawOrder => {
						let order: DecoratedEnergyOrder|null = null;
						if (rawOrder.roomName) {
							const transactionEnergy = Game.market.calcTransactionCost(rawOrder.amount, rawOrder.roomName, terminalRoom.name);
							const netAmount = rawOrder.amount + transactionEnergy;
							const realUnitPrice = (rawOrder.amount * rawOrder.price) / netAmount;
							order = {
								id: rawOrder.id,
								grossAmount: rawOrder.amount,
								netAmount: netAmount,
								realUnitPrice: realUnitPrice
							};
							energyBuyOrders.push(order);
						}
					});

					energyBuyOrders.sort((a: DecoratedEnergyOrder, b: DecoratedEnergyOrder) => {
						return b.realUnitPrice - a.realUnitPrice; //highest first
					});

					cache.energyBuyOrdersSortedByRealUnitPrice = energyBuyOrders
				}

				return cache.energyBuyOrdersSortedByRealUnitPrice;
			}

			function getEnergySellOrdersSortedByRealUnitPrice(): DecoratedEnergyOrder[] {
				//ensure cache.energySellOrdersSortedByRealUnitPrice exists
				if (!cache.energySellOrdersSortedByRealUnitPrice) {
					const energySellOrdersRawAll = Game.market.getAllOrders({type: ORDER_SELL, resourceType: RESOURCE_ENERGY});
					const energySellOrdersRaw = (energySellOrdersRawAll.length <= 100)
						? energySellOrdersRawAll
						: energySellOrdersRawAll.sort((a, b) => a.price - b.price).slice(0, 100); //first 100 sorted for lowest price

					//fill energySellOrders
					const energySellOrders: DecoratedEnergyOrder[] = [];
					energySellOrdersRaw.forEach(rawOrder => {
						let order: DecoratedEnergyOrder|null = null;
						if (rawOrder.roomName) {
							const transactionEnergy = Game.market.calcTransactionCost(rawOrder.amount, rawOrder.roomName, terminalRoom.name);
							const netAmount = rawOrder.amount - transactionEnergy;
							if (netAmount > 0) {
								const realUnitPrice = (rawOrder.amount * rawOrder.price) / netAmount;
								order = {
									id: rawOrder.id,
									grossAmount: rawOrder.amount,
									netAmount: netAmount,
									realUnitPrice: realUnitPrice
								};
								energySellOrders.push(order);
							}
						}
					});

					energySellOrders.sort((a: DecoratedEnergyOrder, b: DecoratedEnergyOrder) => {
						return a.realUnitPrice - b.realUnitPrice; //lowest first
					});

					cache.energySellOrdersSortedByRealUnitPrice = energySellOrders
				}

				return cache.energySellOrdersSortedByRealUnitPrice;
			}

			function makeEnergyInPlan(maxAmountToBuy: number, maxOrderCount: number): EnergyPlan {
				const plan: EnergyPlan = {
					orders: [],
					netAmount: 0,
					realPrice: 0
				};
				let remainingAmount = maxAmountToBuy;
				const sortedOrders = getEnergySellOrdersSortedByRealUnitPrice();
				for (let order of sortedOrders) {
					if (remainingAmount <= 0 || plan.orders.length >= maxOrderCount) break;
					else {
						const netAmountToBuyFromOrder = Math.min(order.netAmount, remainingAmount);
						remainingAmount -= netAmountToBuyFromOrder;

						plan.orders.push({
							id: order.id,
							amount: netAmountToBuyFromOrder * (order.grossAmount / order.netAmount)
						});
						plan.netAmount += netAmountToBuyFromOrder;
						plan.realPrice += netAmountToBuyFromOrder * order.realUnitPrice;
					}
				}

				return plan;
			}

			function makeEnergyOutPlan(maxAmountToSell: number, maxOrderCount: number): EnergyPlan {
				const plan: EnergyPlan = {
					orders: [],
					netAmount: 0,
					realPrice: 0
				};
				let remainingAmount = maxAmountToSell;
				const sortedOrders = getEnergyBuyOrdersSortedByRealUnitPrice();
				for (let order of sortedOrders) {
					if (remainingAmount <= 0 || plan.orders.length >= maxOrderCount) break;
					else {
						const netAmountToSellToOrder = Math.min(order.netAmount, remainingAmount);
						remainingAmount -= netAmountToSellToOrder;

						plan.orders.push({
							id: order.id,
							amount: netAmountToSellToOrder * (order.grossAmount / order.netAmount)
						});
						plan.netAmount += netAmountToSellToOrder;
						plan.realPrice += netAmountToSellToOrder * order.realUnitPrice;
					}
				}

				return plan;
			}

			function getResourceBuyOrdersSortedByUnitPrice(resourceType: string, creditsPerEnergy: number): DecoratedResourceOrder[] {
				//ensure cache.resourceBuyOrdersSortedByUnitPrice[resourceType] exists
				if (!cache.resourceBuyOrdersSortedByUnitPrice[resourceType]) {
					const resourceBuyOrdersRawAll = Game.market.getAllOrders({type: ORDER_BUY, resourceType: resourceType});
					const resourceBuyOrdersRaw = (resourceBuyOrdersRawAll.length <= 100)
						? resourceBuyOrdersRawAll
						: resourceBuyOrdersRawAll.sort((a, b) => b.price - a.price).slice(0, 100); //first 100 sorted for highest price

					//fill resourceBuyOrders
					const resourceBuyOrders: DecoratedResourceOrder[] = [];
					resourceBuyOrdersRaw.forEach(rawOrder => {
						let order: DecoratedResourceOrder|null = null;
						if (rawOrder.roomName) {
							const transactionEnergy = Game.market.calcTransactionCost(rawOrder.amount, rawOrder.roomName, terminalRoom.name);
							const unitEnergyCost = transactionEnergy / rawOrder.amount;
							order = {
								id: rawOrder.id,
								amount: rawOrder.amount,
								unitPriceWithoutEnergy: rawOrder.price,
								unitPriceWithEnergy: rawOrder.price + unitEnergyCost * creditsPerEnergy,
								energyCost: transactionEnergy
							};
							resourceBuyOrders.push(order);
						}
					});

					resourceBuyOrders.sort((a: DecoratedResourceOrder, b: DecoratedResourceOrder) => {
						return b.unitPriceWithEnergy - a.unitPriceWithEnergy; //highest first
					});

					cache.resourceBuyOrdersSortedByUnitPrice[resourceType] = resourceBuyOrders
				}

				return cache.resourceBuyOrdersSortedByUnitPrice[resourceType];
			}

			function getResourceSellOrdersSortedByUnitPrice(resourceType: string, creditsPerEnergy: number): DecoratedResourceOrder[] {
				//ensure cache.resourceSellOrdersSortedByUnitPrice[resourceType] exists
				if (!cache.resourceSellOrdersSortedByUnitPrice[resourceType]) {
					const resourceSellOrdersRawAll = Game.market.getAllOrders({type: ORDER_SELL, resourceType: resourceType});
					const resourceSellOrdersRaw = (resourceSellOrdersRawAll.length <= 100)
						? resourceSellOrdersRawAll
						: resourceSellOrdersRawAll.sort((a, b) => a.price - b.price).slice(0, 100); //first 100 sorted for lowest price

					//fill resourceSellOrders
					const resourceSellOrders: DecoratedResourceOrder[] = [];
					resourceSellOrdersRaw.forEach(rawOrder => {
						let order: DecoratedResourceOrder|null = null;
						if (rawOrder.roomName) {
							const transactionEnergy = Game.market.calcTransactionCost(rawOrder.amount, rawOrder.roomName, terminalRoom.name);
							const unitEnergyCost = transactionEnergy / rawOrder.amount;
							order = {
								id: rawOrder.id,
								amount: rawOrder.amount,
								unitPriceWithoutEnergy: rawOrder.price,
								unitPriceWithEnergy: rawOrder.price + unitEnergyCost * creditsPerEnergy,
								energyCost: transactionEnergy
							};
							resourceSellOrders.push(order);
						}
					});

					resourceSellOrders.sort((a: DecoratedResourceOrder, b: DecoratedResourceOrder) => {
						return a.unitPriceWithEnergy - b.unitPriceWithEnergy; //lowest first
					});

					cache.resourceSellOrdersSortedByUnitPrice[resourceType] = resourceSellOrders
				}

				return cache.resourceSellOrdersSortedByUnitPrice[resourceType];
			}

			function makeResourceInPlan(resourceType: string, maxAmountToBuy: number, maxOrderCount: number, creditsPerEnergy: number): ResourcePlan {
				const sortedOrders = getResourceSellOrdersSortedByUnitPrice(resourceType, creditsPerEnergy);
				return makeResourcePlan(sortedOrders, resourceType, maxAmountToBuy, maxOrderCount);
			}
			function makeResourceOutPlan(resourceType: string, maxAmountToBuy: number, maxOrderCount: number, creditsPerEnergy: number): ResourcePlan {
				const sortedOrders = getResourceBuyOrdersSortedByUnitPrice(resourceType, creditsPerEnergy);
				return makeResourcePlan(sortedOrders, resourceType, maxAmountToBuy, maxOrderCount);
			}
			function makeResourcePlan(sortedOrders: DecoratedResourceOrder[], resourceType: string, maxAmount: number, maxOrderCount: number): ResourcePlan {
				const plan: ResourcePlan = {
					resourceType: resourceType,
					orders: [],
					amount: 0,
					priceWithoutEnergy: 0,
					energyCost: 0
				};
				let remainingAmount = maxAmount;
				for (let order of sortedOrders) {
					if (remainingAmount <= 0 || plan.orders.length >= maxOrderCount) break;
					else {
						const amount = Math.min(order.amount, remainingAmount);
						remainingAmount -= amount;

						plan.orders.push({
							id: order.id,
							amount: amount
						});
						plan.amount += amount;
						plan.priceWithoutEnergy += amount * order.unitPriceWithoutEnergy;
						plan.energyCost += order.energyCost * (amount / order.amount);
					}
				}

				return plan;
			}
		}

		Timer.end("BuySellLogic.onTick()");
	}

	static run(room: Room) {
		Log.log("ignoring BuySellLogic::run() from room " + room.name);

		// if (Game.time % 10 != 0) return;
		// const start = new Date().getTime();
		// console.log('BuySellLogic::run() start');
		//
		// const amountToSell = 10000;
		// const maxFee = amountToSell;
		// const minPrice = 0.03;
		//
		// const terminal = room.terminal;
		// if (terminal) {
		// 	if (terminal.cooldown == 0 && terminal.store[RESOURCE_ENERGY] >= amountToSell + maxFee) {
		//
		// 		const orders = Game.market
		// 			.getAllOrders({type: ORDER_BUY, resourceType: RESOURCE_ENERGY})
		// 			.filter((order: Order) => order.roomName && order.remainingAmount > 0);
		// 		//console.log('orders: ', JSON.stringify(orders));
		//
		// 		const sortedOrdersData = orders
		// 			.filter(o => o.price >= minPrice)
		// 			.map(order => {
		// 				const credits = amountToSell * order.price;
		// 				const fee = Game.market.calcTransactionCost(amountToSell, room.name, order.roomName as string)
		// 					|| maxFee + 1;
		// 				//console.log('{id: order.id, credits: credits, fee: fee}: ', JSON.stringify({id: order.id, credits: credits, fee: fee}));
		// 				return {id: order.id, credits: credits, fee: fee};
		// 			})
		// 			.filter(o => o.fee <= maxFee)
		// 			.sort((a, b) => a.fee - b.fee) //lowest first
		// 			.sort((a, b) => b.credits - a.credits); //highest first
		// 		const sortedOrderIds = sortedOrdersData.map(o => o.id);
		// 		sortedOrdersData.forEach((d, i) => {
		// 			console.log('sortedOrdersData['+i+']: ', JSON.stringify(d));
		// 		});
		//
		// 		console.log('sortedOrdersData[0]: ', JSON.stringify(sortedOrdersData[0]));
		//
		// 		const orderId = sortedOrderIds[0];
		// 		if (orderId) {
		// 			const dealResult = Game.market.deal(orderId, amountToSell, room.name);
		// 			console.log('dealResult: ', dealResult);
		// 		}
		// 	} else {
		// 		Log.log('waiting for terminal cooldown || for ' + (amountToSell + maxFee) +' energy');
		// 	}
		//
		// 	console.log('BuySellLogic::run() duration: ', new Date().getTime() - start);
		// } else {
		// 	var maxTerminals = Util.maxStructureCountIn(STRUCTURE_TERMINAL, room);
		//
		//
		// 	if (maxTerminals > 0) {
		// 		//const pattern = BuildPattern.forRoom(room);
		// 		//const terminalPos = pattern.getTerminalPos();
		//
		//
		// 		//const terminalPos = BuildPattern.forRoom(room).terminal;
		//
		//
		// 		const terminalPos = null;
		// 		if (terminalPos) {
		// 			room.createConstructionSite(terminalPos, STRUCTURE_TERMINAL);
		// 		} else {
		// 			Log.error('Failed to find pos to build terminal in ' + room.name);
		// 		}
		// 	}
		// }
	}

	static generateSpawnRequest(): SpawnRequest {
		return {
			priority: 0,
			generateBody: () => [],
			memory: {role: 'none'}
		};
	}
}