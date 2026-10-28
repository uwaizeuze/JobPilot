import { GreenhouseProvider } from "./greenhouse-provider";
import { IndeedProvider } from "./indeed-provider";
import {
  type JobSourceProvider,
  type ProviderCapabilities,
} from "./job-source-provider.interface";
import { LeverProvider } from "./lever-provider";
import { LinkedInProvider } from "./linkedin-provider";
import { ManualImportProvider } from "./manual-import-provider";
import { NaukriProvider } from "./naukri-provider";

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, JobSourceProvider> = new Map();

  private constructor() {
    this.register(new ManualImportProvider());
    this.register(new GreenhouseProvider());
    this.register(new LeverProvider());
    this.register(new LinkedInProvider());
    this.register(new IndeedProvider());
    this.register(new NaukriProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(provider: JobSourceProvider): void {
    this.providers.set(provider.getProviderName().toLowerCase(), provider);
  }

  public getProvider(name: string): JobSourceProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  public getAllProviders(): JobSourceProvider[] {
    return Array.from(this.providers.values());
  }

  public async getCatalog(): Promise<
    Array<{
      name: string;
      capabilities: ProviderCapabilities;
      isConfigured: boolean;
    }>
  > {
    const list = this.getAllProviders();
    return Promise.all(
      list.map(async (p) => ({
        name: p.getProviderName(),
        capabilities: p.getCapabilities(),
        isConfigured: await p.isConfigured(),
      }))
    );
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
