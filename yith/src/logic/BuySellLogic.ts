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
		if ((Game.time+1) % 10 != 0) return;
		if (All.rooms()[0].name == 'sim') return;

		Timer.start("BuySellLogic.onTick()");

		let mainRoom: Room|null = (Memory['mainRoomName'])
			? Game.rooms[Memory['mainRoomName']] || null
			: null;
		if (! (mainRoom && mainRoom.terminal)) {
			const room = All.rooms().filter(r => !!r.terminal)[0];
			if (room && room.terminal) {
				Memory['mainRoomName'] = room.name;
				mainRoom = room;
			}
		}
		const terminal = (mainRoom)
			? mainRoom.terminal || null
			: null;
		const nuker = (mainRoom)
			? All.nukerIn(mainRoom)
			: null;

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
		const lackFreeSpaceThreshold = 50000;
		const extraEnergyThreshold = 50000;
		const maxExtraToSellAtOnce = 5000;
		const maxReservesToBuyAtOnce = 5000;
		const maxResourcesToConsiderPerTick = RESOURCES_ALL.length;
		const softMaxResourceOrdersToConsiderPerTickDefault = 25;
		const buyReservesThresholds: {[resourceType: string]: number} = {};
		if (nuker) buyReservesThresholds[RESOURCE_GHODIUM] = Math.min(1000, Util.freeSpaceIn(nuker, RESOURCE_GHODIUM));
		const mineralFlipSpace = 150000 - Object
			.keys(buyReservesThresholds)
			.map(key => buyReservesThresholds[key])
			.reduce((acc, val) => acc + val, 0);
		const extraMineralThreshold = Math.floor(mineralFlipSpace / (RESOURCES_ALL.length-1));

		//TODO: add handling for case where I don't have enough credits to execute the plans

		if (terminal) {
			const flag = terminal.pos.lookFor(LOOK_FLAGS)[0];
			const softMaxResourceOrdersToConsiderPerTick = (flag && flag.name.match(/^Flag\d+$/) && flag.remove() === OK)
				? 1000
				: softMaxResourceOrdersToConsiderPerTickDefault;

			const tickedPlans = tickPlans(terminal);
			if (!tickedPlans) {
				let considerCount = 0;
				while (considerCount < maxResourcesToConsiderPerTick) {
					considerCount++;
					const queuedPlans = considerQueuingPlans(terminal, considerCount == 1);
					if (queuedPlans) {
						tickPlans(terminal);
						break;
					}

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
					? (terminal.store[plan.resourceType] || 0) >= planAmount + extraEnergyThreshold
					: (terminal.store[plan.resourceType] || 0) >= planAmount && planAmount > 1; //'&& planAmount > 1' is to fix issue where order for 1 unit keeps showing up and causing selling 1 unit at a time over and over
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

		function considerQueuingPlans(terminal: StructureTerminal, firstCall: boolean): boolean {
			const terminalRoom = terminal.room;
			const terminalRoomMem = Mem.of(terminalRoom);
			const terminalSpace = Util.freeSpaceIn(terminal);

			let queuedPlans = false;
			if (firstCall) {
				const freeSpace = Util.freeSpaceIn(terminal);
				if (freeSpace < lackFreeSpaceThreshold) {
					queuedPlans = considerQueuingSellExtraPlan();
				} else {
					queuedPlans = considerQueuingBuyReservesPlan();
				}
			}
			if (!queuedPlans) {
				terminalRoomMem['resourceIndex'] = terminalRoomMem['resourceIndex'] || 0;
				queuedPlans = considerQueuingFlipPlans(RESOURCES_ALL[terminalRoomMem['resourceIndex']]);
				if (!queuedPlans) {
					terminalRoomMem['resourceIndex'] = (terminalRoomMem['resourceIndex'] + 1) % RESOURCES_ALL.length;
				}
			}

			return queuedPlans;

			///////////////////////////////////

			function considerQueuingFlipPlans(resourceType: ResourceConstant): boolean {
				let queuedFlipPlans = false;

				if (resourceType === RESOURCE_ENERGY) {
					try {
						const ambitiousEnergyOutPlan = makeEnergyOutPlan(terminalSpace + 1, 1);
						if (!ambitiousEnergyOutPlan) throw 'failed to make ambitiousEnergyOutPlan.';
						const energyInPlan = makeEnergyInPlan(ambitiousEnergyOutPlan.netAmount, 1);
						if (!energyInPlan) throw 'failed to make energyInPlan.';
						const energyOutPlan = makeEnergyOutPlan(energyInPlan.netAmount, 1);
						if (!energyOutPlan) throw 'failed to make energyOutPlan.';
						const profit = energyOutPlan.netPrice - energyInPlan.netPrice;
						if (profit > 0) {
							queuePlans([energyInPlan, energyOutPlan], terminal);
							queuedFlipPlans = true;
							Log.log("--- Queued Plans Report ---");
							Log.log("Buy: " + energyInPlan.netAmount + "@" + format(energyInPlan.netPrice/energyInPlan.netAmount, 5) + " = $" + format(energyInPlan.netPrice));
							Log.log("Sell: " + energyOutPlan.netAmount + "@" + format(energyOutPlan.netPrice/energyOutPlan.netAmount, 5) + " = $" + format(energyOutPlan.netPrice));
							Log.log("Profit in theory: $" + format(profit) + " on " + resourceType);
							Log.log("--- --- ---");
						} else {
							Log.log("Profit in theory: $" + format(profit) + " on " + resourceType + " so not flipping.");
						}
					} catch (reason) {
						Log.warn("Not trying to flip " + resourceType + " because " + reason);
					}
				} else {
					const energyOnHand = terminal.store[RESOURCE_ENERGY] || 0;
					const extraEnergyOnHand = Math.max(0, energyOnHand - extraEnergyThreshold);
					const preferPurchasedEnergy = extraEnergyOnHand <= 25000;
					const energyPlanForEstimate = (preferPurchasedEnergy)
						? makeEnergyInPlan(terminalSpace, 8)
						: makeEnergyOutPlan(extraEnergyOnHand, 8);
					if (energyPlanForEstimate && energyPlanForEstimate.netAmount > 0) {
						const creditsPerEnergyEstimate = energyPlanForEstimate.netPrice / energyPlanForEstimate.netAmount;
						const flipPlansOrError = planToFlipResource(resourceType, creditsPerEnergyEstimate);
						if (typeof(flipPlansOrError) !== 'string') {
							const flipPlans = flipPlansOrError;
							const resourceInPlan = flipPlans.resourceInPlan;
							const resourceOutPlan = flipPlans.resourceOutPlan;
							const energyUsed = resourceInPlan.energyCost + resourceOutPlan.energyCost;
							const purchaseEnergy = preferPurchasedEnergy || extraEnergyOnHand < energyUsed;
							const energyPlan = (purchaseEnergy)
								? makeEnergyInPlan(energyUsed, 8)
								: makeEnergyOutPlan(energyUsed, 8);

							if (energyPlan) {
								const profit = resourceOutPlan.priceWithoutEnergy
									- resourceInPlan.priceWithoutEnergy
									- energyPlan.netPrice;
								if (profit > 0) {
									if (energyPlan.netAmount >= energyUsed) {
										const plansToQueue = (purchaseEnergy)
											? [energyPlan, resourceInPlan, resourceOutPlan]
											: [resourceInPlan, resourceOutPlan];
										queuePlans(plansToQueue, terminal);
										queuedFlipPlans = true;
										Log.log("--- Queued Plans Report ---");
										if (purchaseEnergy) {
											Log.log("EnergyIn: " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, extraEnergyOnHand)) + " available)");
										} else {
											Log.log("EnergyOut(Theoretical): " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, extraEnergyOnHand)) + " available)");
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
											Log.log("EnergyIn: " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, extraEnergyOnHand)) + " available)");
										} else {
											Log.log("EnergyOut(Theoretical): " + format(energyPlan.netAmount) + "@" + format(energyPlan.netPrice/energyPlan.netAmount, 5) + " = $" + format(energyPlan.netPrice) + " (" + format(Math.max(0, extraEnergyOnHand)) + " available)");
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
								Log.warn("Not trying to flip " + resourceType + " because failed to make energyPlan.");
							}
						} else {
							Log.warn("Not trying to flip " + resourceType + " because " + flipPlansOrError);
						}
					} else {
						Log.warn("Not trying to flip " + resourceType + " because failed to make creditsPerEnergyEstimate.");
					}
				}

				return queuedFlipPlans;
			}

			function considerQueuingSellExtraPlan(): boolean {
				let queuedSellExtraPlan = false;

				//TODO: sell whatever we have the most extra(Resource)Threshold multiples of
				//	for example, if we have 3x extraMineralThreshold amount of O
				//	and 2x extraEnergyThreshold amount of energy
				//	we should sell O even though we have more energy by absolute amount

				for (let resourceType of RESOURCES_ALL.reverse()) {
					if (resourceType == RESOURCE_ENERGY) {
						const extraThreshold = extraEnergyThreshold + (buyReservesThresholds[RESOURCE_ENERGY] || 0);
						const extraEnergy = Math.min(maxExtraToSellAtOnce, Util.amountIn(terminal, resourceType) - extraThreshold);
						if (extraEnergy > 0) {
							const energyOutPlan = makeEnergyOutPlan(extraEnergy, 10);
							if (energyOutPlan !== null) {
								queuePlans([energyOutPlan], terminal);
								queuedSellExtraPlan = true;
								Log.log("--- Queued Plan Report ---");
								Log.log("Sell extra " + resourceType + ": " + format(energyOutPlan.netAmount) + "@" + format(energyOutPlan.netPrice/energyOutPlan.netAmount, 5) + " = $" + format(energyOutPlan.netPrice));
								Log.log("--- --- ---");
								break;
							}
						}
					} else {
						const creditsPerEnergyEstimate = makeCreditsPerEnergyEstimate();
						if (creditsPerEnergyEstimate) {
							const extraThreshold = extraMineralThreshold + (buyReservesThresholds[resourceType] || 0);
							const extraMineral = Math.min(maxExtraToSellAtOnce, Util.amountIn(terminal, resourceType) - extraThreshold);
							if (extraMineral > 0) {
								const mineralOutPlan = makeResourceOutPlan(resourceType, extraMineral, 10, creditsPerEnergyEstimate);
								if (mineralOutPlan !== null) {
									queuePlans([mineralOutPlan], terminal);
									queuedSellExtraPlan = true;
									Log.log("--- Queued Plan Report ---");
									Log.log("Sell extra " + resourceType + ": " + format(mineralOutPlan.amount) + "@" + format(mineralOutPlan.priceWithoutEnergy/mineralOutPlan.amount, 5) + " = $" + format(mineralOutPlan.priceWithoutEnergy));
									Log.log("--- --- ---");
									break;
								}
							}
						} else {
							Log.warn("Not trying to sell extra " + resourceType + " because failed to make creditsPerEnergyEstimate.");
							break;
						}
					}
				}

				return queuedSellExtraPlan;
			}

			function considerQueuingBuyReservesPlan() {
				let queuedBuyReservePlan = false;

				for (let key in buyReservesThresholds) {
					const resourceType = key as ResourceConstant;
					const buyThreshold = buyReservesThresholds[resourceType];

					if (resourceType == RESOURCE_ENERGY) {
						const neededEnergy = Math.min(maxReservesToBuyAtOnce, buyThreshold - Util.amountIn(terminal, resourceType));
						if (neededEnergy > 0) {
							const energyInPlan = makeEnergyInPlan(neededEnergy, 10);
							if (energyInPlan !== null) {
								queuePlans([energyInPlan], terminal);
								queuedBuyReservePlan = true;
								Log.log("--- Queued Plan Report ---");
								Log.log("Buy reserve " + resourceType + ": " + format(energyInPlan.netAmount) + "@" + format(energyInPlan.netPrice/energyInPlan.netAmount, 5) + " = $" + format(energyInPlan.netPrice));
								Log.log("--- --- ---");
								break;
							}
						}
					} else {
						const creditsPerEnergyEstimate = makeCreditsPerEnergyEstimate();
						if (creditsPerEnergyEstimate) {
							const neededMineral = Math.min(maxReservesToBuyAtOnce, buyThreshold - Util.amountIn(terminal, resourceType));
							if (neededMineral > 0) {
								const mineralInPlan = makeResourceInPlan(resourceType, neededMineral, 10, creditsPerEnergyEstimate);
								if (mineralInPlan !== null) {
									queuePlans([mineralInPlan], terminal);
									queuedBuyReservePlan = true;
									Log.log("--- Queued Plan Report ---");
									Log.log("Buy reserve " + resourceType + ": " + format(mineralInPlan.amount) + "@" + format(mineralInPlan.priceWithoutEnergy/mineralInPlan.amount, 5) + " = $" + format(mineralInPlan.priceWithoutEnergy));
									Log.log("--- --- ---");
									break;
								}
							}
						} else {
							Log.warn("Not trying to buy reserve " + resourceType + " because failed to make creditsPerEnergyEstimate.");
							break;
						}
					}
				}

				return queuedBuyReservePlan;

			}

			function makeCreditsPerEnergyEstimate(): number|null {
				const energyOnHand = terminal.store[RESOURCE_ENERGY] || 0;
				const extraEnergyOnHand = Math.max(0, energyOnHand - extraEnergyThreshold);
				const preferPurchasedEnergy = extraEnergyOnHand <= 25000;
				const energyPlanForEstimate = (preferPurchasedEnergy)
					? makeEnergyInPlan(terminalSpace + 1, 8)
					: makeEnergyOutPlan(extraEnergyOnHand, 8);
				return (energyPlanForEstimate && energyPlanForEstimate.netAmount > 0)
					? energyPlanForEstimate.netPrice / energyPlanForEstimate.netAmount
					: null;
			}

			function planToFlipResource(resourceType: ResourceConstant, creditsPerEnergyEstimate: number): ResourceFlipPlans|string {
				try {
					//show informative error messages if appropriate (this paragraph has no other purpose)
					const availableOutOrders = getResourceBuyOrdersSortedByAdjustedUnitPrice(resourceType, creditsPerEnergyEstimate);
					if (availableOutOrders.length === 0) throw '0 availableOutOrders found.';
					const availableInOrders = getResourceSellOrdersSortedByAdjustedUnitPrice(resourceType, creditsPerEnergyEstimate);
					if (availableInOrders.length === 0) throw '0 availableInOrders found.';

					const ambitiousResourceOutPlan = makeResourceOutPlan(resourceType, terminalSpace, 1, creditsPerEnergyEstimate);
					if (!ambitiousResourceOutPlan) throw 'failed to make ambitiousResourceOutPlan.';
					const ambitiousResourceInPlan = makeResourceInPlan(resourceType, ambitiousResourceOutPlan.amount, 1, creditsPerEnergyEstimate);
					if (!ambitiousResourceInPlan) throw 'failed to make ambitiousResourceInPlan.';
					const ambitiousEnergyCost = ambitiousResourceInPlan.energyCost + ambitiousResourceOutPlan.energyCost;

					//remake plans (leaving space for the energy needed this time and limiting Out.amount to available In.amount)
					const amountToFlip = Math.min(terminalSpace - ambitiousEnergyCost, ambitiousResourceInPlan.amount);
					const resourceOutPlan = makeResourceOutPlan(resourceType, amountToFlip, 1, creditsPerEnergyEstimate);
					if (!resourceOutPlan) throw 'failed to make resourceOutPlan.';
					const resourceInPlan = makeResourceInPlan(resourceType, resourceOutPlan.amount, 1, creditsPerEnergyEstimate);
					if (!resourceInPlan) throw 'failed to make resourceInPlan.';

					return {
						resourceInPlan: resourceInPlan,
						resourceOutPlan: resourceOutPlan,
					};
				} catch (reason) {
					return reason
				}
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

			function makeEnergyInPlan(maxAmountToBuy: number, maxOrderCount: number): EnergyPlan|null {
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

				return (plan.orders.length > 0)
					? plan
					: null;
			}

			function makeEnergyOutPlan(maxAmountToSell: number, maxOrderCount: number): EnergyPlan|null {
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

				return (plan.orders.length > 0)
					? plan
					: null;
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

			function makeResourceInPlan(resourceType: ResourceConstant, maxAmountToBuy: number, maxOrderCount: number, creditsPerEnergy: number): ResourcePlan|null {
				const sortedOrders = getResourceSellOrdersSortedByAdjustedUnitPrice(resourceType, creditsPerEnergy);
				return makeResourcePlan(sortedOrders, resourceType, maxAmountToBuy, maxOrderCount);
			}
			function makeResourceOutPlan(resourceType: ResourceConstant, maxAmountToBuy: number, maxOrderCount: number, creditsPerEnergy: number): ResourcePlan|null {
				const sortedOrders = getResourceBuyOrdersSortedByAdjustedUnitPrice(resourceType, creditsPerEnergy);
				return makeResourcePlan(sortedOrders, resourceType, maxAmountToBuy, maxOrderCount);
			}
			function makeResourcePlan(sortedOrders: DecoratedResourceOrder[], resourceType: ResourceConstant, maxAmount: number, maxOrderCount: number): ResourcePlan|null {
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

				return (plan.orders.length > 0)
					? plan
					: null;
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
		if (Game.time % 10 != 0) return;

		const terminal = room.terminal;
		if (!terminal) {
			const terminalSite = All.constructionSitesIn(room, STRUCTURE_TERMINAL)[0];
			if (!terminalSite) {
				let maxTerminals = Util.maxStructureCountIn(STRUCTURE_TERMINAL, room);
				if (maxTerminals > 0) {
					let pos: RoomPosition|undefined;

					//pos = closest tile to spawn where is plains and all 4 sides are plains|swamp
					let spawn: StructureSpawn = All.spawnsIn(room)[0];
					if (spawn) {
						let origin: RoomPosition = spawn.pos;
						let n = 9; //skip first 8
						while (n != -1 && n < 150) {
							let nthPos: RoomPosition|undefined = Util.getNthClosest(origin, n);
							if (nthPos) {
								if (Util.terrainMatch([nthPos], ['plain']) && Util.isBuildable([nthPos])) {
									let sides = Util.getAdjacent4(nthPos);
									if (Util.terrainMatch(sides, ['plain', 'swamp']) && Util.isBuildable(sides)) {
										//found valid pos
										pos = nthPos;
										break;
									}
								}
							}

							n++;
						}
					}

					if (pos) {
						room.createConstructionSite(pos, STRUCTURE_TERMINAL);
					} else {
						Log.error('Failed to find pos to build terminal in ' + room.name);
					}
				}
			}
		}
	}

	static generateSpawnRequest(): SpawnRequest {
		return {
			priority: 0,
			generateBody: () => [],
			memory: {role: 'none'}
		};
	}
}