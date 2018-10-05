interface SpawnRequest {
	priority: number,
	generateBody(energyAvailable: number): BodyPartConstant[],
	memory: {role: string}
}

export default SpawnRequest;