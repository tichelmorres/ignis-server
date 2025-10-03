import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

const HOSTNAME = "0.0.0.0";
const PORT = 3000;

// store the latest Pico data
let latestPicoData: {
	timestamp?: number;
	class?: string;
	confidence?: number;
	fire_score?: number;
	nofire_score?: number;
} = {};

// store a history of received values
const picoHistory: {
	timestamp: number;
	class?: string;
	confidence?: number;
	fire_score?: number;
	nofire_score?: number;
}[] = [];

const app = new Elysia()
	.use(cors())
	.get("/", () => "See the fire before it spreads...")
	.get("/pico_data", ({ query }) => {
		console.log("=== RECV ===");
		console.log(`Predicted Class: ${query.class}`);
		console.log(`Confidence: ${query.confidence}`);
		console.log(`Fire Score: ${query.fire_score}`);
		console.log(`No Fire Score: ${query.nofire_score}`);

		const newData = {
			timestamp: Date.now(),
			class: query.class ?? "Unknown",
			confidence: query.confidence ? parseFloat(query.confidence) : undefined,
			fire_score: query.fire_score ? parseFloat(query.fire_score) : undefined,
			nofire_score: query.nofire_score
				? parseFloat(query.nofire_score)
				: undefined,
		};

		latestPicoData = newData;
		picoHistory.push(newData);

		// Keep only last 100 results
		if (picoHistory.length > 100) {
			picoHistory.shift();
		}

		return "ACK";
	})
	.get("/pico_data/latest", () => latestPicoData)
	.get("/pico_data/history", () => picoHistory)
	.listen({ hostname: HOSTNAME, port: PORT });

console.log(
	`IGNIS server is running at http://${app.server?.hostname}:${app.server?.port}`,
);
