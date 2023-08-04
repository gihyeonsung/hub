import { readFile } from "fs/promises";
import { writeFile } from "fs/promises";

export type Config = {
  tickInterval: number;
  host: string;
  port: number;
  hueHost: string;
  hueUsername: string;
  hueClientKey: string;
  scenes: { time: number, brightness: number; cool: number; }[];
}

export class ConfigRepo {
  constructor (private readonly filepath: string) {}

  async save(data: Config): Promise<void> {
    await writeFile(this.filepath, JSON.stringify(data), 'utf-8')
  }

  async load(): Promise<Config> {
    const data = await readFile(this.filepath, 'utf-8');
    return JSON.parse(data);
  }
}

