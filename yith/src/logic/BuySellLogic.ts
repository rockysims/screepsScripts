import SpawnRequest from 'SpawnRequest';
import Log from 'util/Log';
import All from "All";
import Timer from "util/Timer";
import Util from "util/Util";
import Mem from "util/Mem";

interface DecoratedEnergyOrder {
	id: string,
	grossAmount: number,
	netAmount: number,
	netUnitPrice: number
}

interface DecoratedResourceOrder {
	id: string,
	amount: number,
	unitPriceWithoutEnergy: number,
	unitPriceWithEnergy: number
	energyCost: number,
}

interface EnergyPlan {
	resourceType: ResourceConstant,
	orders: EnergyPlanOrder[],
	netAmount: number,
	netPrice: number,
	done?: boolean
}
interface EnergyPlanOrder {
	id: string,
	amount: number,
	netAmount: number,
	netUnitPrice: number,
	result?: number,
	done?: boolean
}

interface ResourcePlan {
	resourceType: ResourceConstant,
	orders: ResourcePlanOrder[],
	amount: number,
	priceWithoutEnergy: number,
	energyCost: number,
	done?: boolean
}
interface ResourcePlanOrder {
	id: string,
	amount: number,
	unitPriceWithoutEnergy: number,
	result?: number,
	done?: boolean
}

interface ResourceFlipPlans {
	resourceInPlan: ResourcePlan,
	resourceOutPlan: ResourcePlan,
}

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

		const cache: {
			energyBuyOrdersSortedByNetUnitPrice?: DecoratedEnergyOrder[],
			energySellOrdersSortedByNetUnitPrice?: DecoratedEnergyOrder[],
			resourceBuyOrdersSortedByAdjustedUnitPrice: {[resourceType: string]: DecoratedResourceOrder[]},
			resourceSellOrdersSortedByAdjustedUnitPrice: {[resourceType: string]: DecoratedResourceOrder[]}
		} = {
			resourceBuyOrdersSortedByAdjustedUnitPrice: {},
			resourceSellOrdersSortedByAdjustedUnitPrice: {}
		};

		const dryRunMode = false;
		const lackEnergyThreshold = 50000;
		const extraEnergyThreshold = 200000;
		const maxResourcesToConsiderPerTick = RESOURCES_ALL.length;
		const softMaxResourceOrdersToConsiderPerTick = 25;

		//TODO: add handling for case where I don't have enough credits to execute the plans

		const terminal: StructureTerminal|null = Game.getObjectById(Memory['mainTerminalId']);
		if (terminal) {
			const tickedPlans = tickPlans(terminal);
			if (!tickedPlans) {
				let considerCount = 0;
				while (considerCount < maxResourcesToConsiderPerTick) {
					considerCount++;
					considerQueuingPlans(terminal);
					if (tickPlans(terminal)) break;

					let resourceOrdersCached = 0;
					for (let resourceType of RESOURCES_ALL) {
						resourceOrdersCached += (cache.resourceBuyOrdersSortedByAdjustedUnitPrice[resourceType] || []).length;
						resourceOrdersCached += (cache.resourceSellOrdersSortedByAdjustedUnitPrice[resourceType] || []).length;
					}
					if (resourceOrdersCached > softMaxResourceOrdersToConsiderPerTick) {
						Log.log("resourceOrdersCached is " + resourceOrdersCached + " so done considering resources to flip for this tick.");
						break;
					}
				}
			}
		}

		Timer.end("BuySellLogic.onTick()");

		///////////////////////////////////

		function queuePlans(plans: (EnergyPlan|ResourcePlan)[], terminal: StructureTerminal) {
			const terminalRoomMem = Mem.of(terminal.room);
			if (!terminalRoomMem['curPlans']) {
				terminalRoomMem['curPlans'] = plans;
			} else {
				Log.error("Failed to queue new plans because curPlans still pending.");
				Log.log("curPlans: " + JSON.stringify(terminalRoomMem['curPlans']));
				Log.log("new plans: " + JSON.stringify(plans));
			}
		}

		function tickPlans(terminal: StructureTerminal): boolean {
			const terminalRoomMem = Mem.of(terminal.room);
			let ticked = false;

			const curPlans = terminalRoomMem['curPlans'] as (EnergyPlan|ResourcePlan)[]|undefined;
			if (curPlans) {
				for (let curPlan of curPlans) {
					if (!curPlan.done) {
						if (tickPlan(curPlan, terminal)) {
							ticked = true;
							break;
						} else {
							//done ticking plan
							curPlan.done = true;
						}
					}
				}
			}

			if (!ticked) {
				delete terminalRoomMem['curPlans'];

				if (curPlans) {
					let ordersTotal = 0;
					let ordersWorked = 0;
					for (let curPlan of curPlans) {
						for (let order of curPlan.orders) {
							ordersTotal++;
							if (order.result === OK || (order.result && order.result >= OK)) {
								ordersWorked++;
							}
						}
					}

					Log.log("curPlans orders worked/total: " + ordersWorked + "/" + ordersTotal);
					Log.log("Done executing curPlans: " + JSON.stringify(curPlans));
				}
			}

			return ticked;
		}

		function tickPlan(plan: EnergyPlan|ResourcePlan, terminal: StructureTerminal): boolean {
			for (let order of plan.orders) {
				if (!order.done) {
					const result = executeOrder(order, plan, terminal);
					order.result = result;
					if (result >= OK) { //success
						if (result === OK) {
							//executed deal
							order.done = true;
							return true; //ticked plan
						} else {
							//decided to skip
							order.done = true;
							//continue to next order
						}
					} else { //fail
						if (result == ERR_TIRED) {
							//need to wait
							return true; //ticked plan
						} else {
							//something went wrong
							order.done = true;
							//continue to next order
						}
					}
				}
			}

			return false; //plan didn't need to tick (no orders needed to tick)
		}

		function executeOrder(order: EnergyPlanOrder|ResourcePlanOrder, plan: EnergyPlan|ResourcePlan, terminal: StructureTerminal): number {
			const isEnergyPlan = plan.resourceType == RESOURCE_ENERGY;
			const planAmount = (isEnergyPlan)
				? (plan as EnergyPlan).netAmount
				: (plan as ResourcePlan).amount;

			const rawOrder: Order|null = Game.market.getOrderById(order.id);
			if (rawOrder) {
				const isInOrder = rawOrder.type === ORDER_SELL;

				//build dealStr
				const displayAmount = (isEnergyPlan)
					? (order as EnergyPlanOrder).netAmount
					: (order as ResourcePlanOrder).amount;
				const displayUnitPrice = (isEnergyPlan)
					? (order as EnergyPlanOrder).netUnitPrice
					: (order as ResourcePlanOrder).unitPriceWithoutEnergy;
				const dealStr = ((isInOrder)?"Buy":"Sell") + " " + plan.resourceType + ": "
					+ format(displayAmount) + "@" + format(displayUnitPrice, 5)
					+ " = $" + format(displayAmount * displayUnitPrice);

				const enoughOnHand = (isEnergyPlan)
					? (terminal.store[plan.resourceType] || 0) >= planAmount + lackEnergyThreshold
					: (terminal.store[plan.resourceType] || 0) >= planAmount;
				if (isInOrder && enoughOnHand) {
					Log.log("SKIP " + dealStr);
					return 302;
				} else {
					if (!dryRunMode) {
						const result = Game.market.deal(order.id, order.amount, terminal.room.name);
						order.result = result;
						if (result == OK) {
							Log.log(dealStr);
						} else if (result == ERR_TIRED) {
							Log.log("TIRED " + dealStr);
						} else {
							let resultName: string = "UNKNOWN";
							if (result === ERR_FULL) resultName = "ERR_FULL";
							if (result === ERR_NOT_OWNER) resultName = "ERR_NOT_OWNER";
							if (result === ERR_INVALID_ARGS) resultName = "ERR_INVALID_ARGS";
							if (result === ERR_NOT_ENOUGH_RESOURCES) resultName = "ERR_NOT_ENOUGH_RESOURCES";
							Log.warn("FAILED " + dealStr
								+ " result: " + result + "(" + resultName + ")"
								+ " " + order.id);
						}
						return result;
					} else { //dryRunMode
						Log.log("WOULD " + dealStr);
						return OK;
					}
				}
			} else {
				Log.error("No order " + order.id);
				return -404;
			}
		}

		function considerQueuingPlans(terminal: StructureTerminal) {
			const terminalRoom = terminal.room;
			const terminalRoomMem = Mem.of(terminalRoom);
			const terminalSpace = Util.freeSpaceIn(terminal);

			terminalRoomMem['resourceIndex'] = terminalRoomMem['resourceIndex'] || 0;
			const resourceType = RESOURCES_ALL[terminalRoomMem['resourceIndex']];
			let profit = 0;
			if (resourceType === RESOURCE_ENERGY) {
				const ambitiousEnergyOutPlan = makeEnergyOutPlan(terminalSpace, 1);
				const energyInPlan = makeEnergyInPlan(ambitiousEnergyOutPlan.netAmount, 1);
				const energyOutPlan = makeEnergyOutPlan(energyInPlan.netAmount, 1);
				profit = energyOutPlan.netPrice - energyInPlan.netPrice;
				if (profit > 0) {
					queuePlans([energyInPlan, energyOutPlan], terminal);
					Log.log("--- Queued Plans Report ---");
					Log.log("Buy: " + energyInPlan.netAmount + "@" + format(energyInPlan.netPrice/energyInPlan.netAmount, 5) + " = $" + format(energyInPlan.netPrice));
					Log.log("Sell: " + energyOutPlan.netAmount + "@" + format(energyOutPlan.netPrice/energyOutPlan.netAmount, 5) + " = $" + format(energyOutPlan.netPrice));
					Log.log("Profit in theory: $" + format(profit) + " on " + resourceType);
					Log.log("--- --- ---");
				} else {
					Log.log("Profit in theory: $" + format(profit) + " on " + resourceType + " so not flipping.");
				}
			} else {
				const energyOnHand = terminal.store[RESOURCE_ENERGY] || 0;
				const availableEnergyOnHand = Math.max(0, energyOnHand - lackEnergyThreshold);
				const preferPurchasedEnergy = availableEnergyOnHand <= 25000;
				const energyPlanForEstimate = (preferPurchasedEnergy)
					? makeEnergyInPlan(terminalSpace, 8)
					: makeEnergyOutPlan(availableEnergyOnHand, 8);
				if (energyPlanForEstimate.netAmount > 0) {
					const creditsPerEnergyEstimate = energyPlanForEstimate.netPrice / energyPlanForEstimate.netAmount;
					const flipPlans = planToFlipResource(resourceType, creditsPerEnergyEstimate);
					const resourceInPlan = flipPlans.resourceInPlan;
					const resourceOutPlan = flipPlans.resourceOutPlan;
					const energyUsed = resourceInPlan.energyCost + resourceOutPlan.energyCost;
					const purchaseEnergy = preferPurchasedEnergy || availableEnergyOnHand < energyUsed;
					const energyPlan = (purchaseEnergy)
						? makeEnergyInPlan(energyUsed, 8)
						: makeEnergyOutPlan(energyUsed, 8);

					profit = resourceOutPlan.priceWithoutEnergy
						- resourceInPlan.priceWithoutEnergy
						- energyPlan.netPrice;
					if (profit > 0) {
						if (energyPlan.netAmount >= energyUsed) {
							const plansToQueue = (purchaseEnergy)
								? [energyPlan, resourceInPlan, resourceOutPlan]
								: [resourceInPlan, resourceOutPlan];
							queuePlans(plansToQueue, terminal);
							Log.log("--- Queued Plans Report ---");
							if (purchaseEnergy) {
								Log.log("EnergyIn: " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, availableEnergyOnHand)) + " available)");
							} else {
								Log.log("EnergyOut(Theoretical): " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, availableEnergyOnHand)) + " available)");
							}
							Log.log("Buy: " + resourceInPlan.amount + "@" + format(resourceInPlan.priceWithoutEnergy/resourceInPlan.amount, 5) + " = $" + format(resourceInPlan.priceWithoutEnergy));
							Log.log("Sell: " + resourceOutPlan.amount + "@" + format(resourceOutPlan.priceWithoutEnergy/resourceOutPlan.amount, 5) + " = $" + format(resourceOutPlan.priceWithoutEnergy));
							Log.log("Profit in theory: $" + format(profit) + " on " + resourceType);
							Log.log("--- --- ---");
						} else {
							Log.warn("Failed to flip " + resourceType + " because not enough energy on market." + ((purchaseEnergy)?"":" !purchaseEnergy"));
						}
					} else {
						const profitWithoutEnergyCosts = resourceOutPlan.priceWithoutEnergy - resourceInPlan.priceWithoutEnergy;
						if (profitWithoutEnergyCosts > 0) {
							Log.log("--- Not Flipping Report ---");
							if (purchaseEnergy) {
								Log.log("EnergyIn: " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, availableEnergyOnHand)) + " available)");
							} else {
								Log.log("EnergyOut(Theoretical): " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, availableEnergyOnHand)) + " available)");
							}
							Log.log("Buy: " + resourceInPlan.amount + "@" + format(resourceInPlan.priceWithoutEnergy/resourceInPlan.amount, 5) + " = $" + format(resourceInPlan.priceWithoutEnergy));
							Log.log("Sell: " + resourceOutPlan.amount + "@" + format(resourceOutPlan.priceWithoutEnergy/resourceOutPlan.amount, 5) + " = $" + format(resourceOutPlan.priceWithoutEnergy));
							Log.log("Profit in theory: $" + format(profit) + " on " + resourceType + " so not flipping.");
							Log.log("--- --- ---");
						} else {
							Log.log("Profit in theory: $" + format(profit) + " on " + resourceType + " so not flipping.");
						}
					}
				} else {
					Log.warn("No energy for sale so not trying to flip " + resourceType + ".");
				}
			}
			if (profit <= 0) {
				terminalRoomMem['resourceIndex'] = (terminalRoomMem['resourceIndex'] + 1) % RESOURCES_ALL.length;

				const extraEnergy = terminal.store[RESOURCE_ENERGY] - extraEnergyThreshold;
				if (extraEnergy > 0) {
					const energyOutPlan = makeEnergyOutPlan(extraEnergy, 10);
					queuePlans([energyOutPlan], terminal);
					Log.log("--- Queued Plan Report ---");
					Log.log("Sell extra energy: " + format(energyOutPlan.netAmount) + "@" + format(energyOutPlan.netPrice/energyOutPlan.netAmount, 5) + " = $" + format(energyOutPlan.netPrice));
					Log.log("--- --- ---");
				} else {
					//TODO: sell everything in terminal (except a little energy) in case flip fails part way through
				}
			}

			///////////////////////////////////

			function planToFlipResource(resourceType: ResourceConstant, creditsPerEnergyEstimate: number): ResourceFlipPlans {
				const ambitiousResourceOutPlan = makeResourceOutPlan(resourceType, terminalSpace, 1, creditsPerEnergyEstimate);
				const ambitiousResourceInPlan = makeResourceInPlan(resourceType, ambitiousResourceOutPlan.amount, 1, creditsPerEnergyEstimate);
				const ambitiousEnergyCost = ambitiousResourceInPlan.energyCost + ambitiousResourceOutPlan.energyCost;

				//remake plans (leaving space for the energy needed this time and limiting Out.amount to available In.amount)
				const amountToFlip = Math.min(terminalSpace - ambitiousEnergyCost, ambitiousResourceInPlan.amount);
				const resourceOutPlan = makeResourceOutPlan(resourceType, amountToFlip, 1, creditsPerEnergyEstimate);
				const resourceInPlan = makeResourceInPlan(resourceType, resourceOutPlan.amount, 1, creditsPerEnergyEstimate);

				return {
					resourceInPlan: resourceInPlan,
					resourceOutPlan: resourceOutPlan,
				};
			}

			function getEnergyBuyOrdersSortedByNetUnitPrice(): DecoratedEnergyOrder[] {
				//ensure cache.energyBuyOrdersSortedByNetUnitPrice exists
				if (!cache.energyBuyOrdersSortedByNetUnitPrice) {
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
							const netUnitPrice = (rawOrder.amount * rawOrder.price) / netAmount;
							order = {
								id: rawOrder.id,
								grossAmount: rawOrder.amount,
								netAmount: netAmount,
								netUnitPrice: netUnitPrice
							};
							energyBuyOrders.push(order);
						}
					});

					energyBuyOrders.sort((a: DecoratedEnergyOrder, b: DecoratedEnergyOrder) => {
						return b.netUnitPrice - a.netUnitPrice; //highest first
					});

					cache.energyBuyOrdersSortedByNetUnitPrice = energyBuyOrders
				}

				return cache.energyBuyOrdersSortedByNetUnitPrice;
			}

			function getEnergySellOrdersSortedByNetUnitPrice(): DecoratedEnergyOrder[] {
				//ensure cache.energySellOrdersSortedByNetUnitPrice exists
				if (!cache.energySellOrdersSortedByNetUnitPrice) {
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
								const netUnitPrice = (rawOrder.amount * rawOrder.price) / netAmount;
								order = {
									id: rawOrder.id,
									grossAmount: rawOrder.amount,
									netAmount: netAmount,
									netUnitPrice: netUnitPrice
								};
								energySellOrders.push(order);
							}
						}
					});

					energySellOrders.sort((a: DecoratedEnergyOrder, b: DecoratedEnergyOrder) => {
						return a.netUnitPrice - b.netUnitPrice; //lowest first
					});

					cache.energySellOrdersSortedByNetUnitPrice = energySellOrders
				}

				return cache.energySellOrdersSortedByNetUnitPrice;
			}

			function makeEnergyInPlan(maxAmountToBuy: number, maxOrderCount: number): EnergyPlan {
				const plan: EnergyPlan = {
					resourceType: RESOURCE_ENERGY,
					orders: [],
					netAmount: 0,
					netPrice: 0
				};
				let remainingAmount = maxAmountToBuy;
				const sortedOrders = getEnergySellOrdersSortedByNetUnitPrice();
				for (let order of sortedOrders) {
					if (remainingAmount <= 0 || plan.orders.length >= maxOrderCount) break;
					else {
						const netAmountToBuyFromOrder = Math.min(order.netAmount, remainingAmount);
						remainingAmount -= netAmountToBuyFromOrder;

						plan.orders.push({
							id: order.id,
							amount: netAmountToBuyFromOrder * (order.grossAmount / order.netAmount),
							netAmount: netAmountToBuyFromOrder,
							netUnitPrice: order.netUnitPrice
						});
						plan.netAmount += netAmountToBuyFromOrder;
						plan.netPrice += netAmountToBuyFromOrder * order.netUnitPrice;
					}
				}

				return plan;
			}

			function makeEnergyOutPlan(maxAmountToSell: number, maxOrderCount: number): EnergyPlan {
				const plan: EnergyPlan = {
					resourceType: RESOURCE_ENERGY,
					orders: [],
					netAmount: 0,
					netPrice: 0
				};
				let remainingAmount = maxAmountToSell;
				const sortedOrders = getEnergyBuyOrdersSortedByNetUnitPrice();
				for (let order of sortedOrders) {
					if (remainingAmount <= 0 || plan.orders.length >= maxOrderCount) break;
					else {
						const netAmountToSellToOrder = Math.min(order.netAmount, remainingAmount);
						remainingAmount -= netAmountToSellToOrder;

						plan.orders.push({
							id: order.id,
							amount: netAmountToSellToOrder * (order.grossAmount / order.netAmount),
							netAmount: netAmountToSellToOrder,
							netUnitPrice: order.netUnitPrice
						});
						plan.netAmount += netAmountToSellToOrder;
						plan.netPrice += netAmountToSellToOrder * order.netUnitPrice;
					}
				}

				return plan;
			}

			function getResourceBuyOrdersSortedByAdjustedUnitPrice(resourceType: ResourceConstant, creditsPerEnergy: number): DecoratedResourceOrder[] {
				//ensure cache.resourceBuyOrdersSortedByAdjustedUnitPrice[resourceType] exists
				if (!cache.resourceBuyOrdersSortedByAdjustedUnitPrice[resourceType]) {
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

					cache.resourceBuyOrdersSortedByAdjustedUnitPrice[resourceType] = resourceBuyOrders
				}

				return cache.resourceBuyOrdersSortedByAdjustedUnitPrice[resourceType];
			}

			function getResourceSellOrdersSortedByAdjustedUnitPrice(resourceType: ResourceConstant, creditsPerEnergy: number): DecoratedResourceOrder[] {
				//ensure cache.resourceSellOrdersSortedByAdjustedUnitPrice[resourceType] exists
				if (!cache.resourceSellOrdersSortedByAdjustedUnitPrice[resourceType]) {
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

					cache.resourceSellOrdersSortedByAdjustedUnitPrice[resourceType] = resourceSellOrders
				}

				return cache.resourceSellOrdersSortedByAdjustedUnitPrice[resourceType];
			}

			function makeResourceInPlan(resourceType: ResourceConstant, maxAmountToBuy: number, maxOrderCount: number, creditsPerEnergy: number): ResourcePlan {
				const sortedOrders = getResourceSellOrdersSortedByAdjustedUnitPrice(resourceType, creditsPerEnergy);
				return makeResourcePlan(sortedOrders, resourceType, maxAmountToBuy, maxOrderCount);
			}
			function makeResourceOutPlan(resourceType: ResourceConstant, maxAmountToBuy: number, maxOrderCount: number, creditsPerEnergy: number): ResourcePlan {
				const sortedOrders = getResourceBuyOrdersSortedByAdjustedUnitPrice(resourceType, creditsPerEnergy);
				return makeResourcePlan(sortedOrders, resourceType, maxAmountToBuy, maxOrderCount);
			}
			function makeResourcePlan(sortedOrders: DecoratedResourceOrder[], resourceType: ResourceConstant, maxAmount: number, maxOrderCount: number): ResourcePlan {
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
							amount: amount,
							unitPriceWithoutEnergy: order.unitPriceWithoutEnergy
						});
						plan.amount += amount;
						plan.priceWithoutEnergy += amount * order.unitPriceWithoutEnergy;
						plan.energyCost += order.energyCost * (amount / order.amount);
					}
				}

				return plan;
			}
		}

		function format(n: number, precision?: number) {
			precision = (precision === undefined)?2:precision;
			let num = n.toFixed(precision);
			while (+num === 0 && precision < 10) {
				precision += 2;
				num = n.toFixed(precision);
			}

			return num
				.replace(/\.(\d*?)0+$/,".$1")
				.replace(/\.$/, "");
		}
	}

	static run(room: Room) {
		return "ignoring BuySellLogic::run() from room " + room.name;
		// Log.log("ignoring BuySellLogic::run() from room " + room.name);

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