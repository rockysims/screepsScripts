interface SpawnRequest {
	priority: number,
	generateBody(energyAvailable: number): string[],
	memory: {role: string}
}

export default SpawnRequest;