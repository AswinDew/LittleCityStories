import { BuildingDefinition, BuildingCategory } from './types';

export class BuildingRegistry {
  private static instance: BuildingRegistry | null = null;
  private catalog: Map<string, BuildingDefinition> = new Map();

  private constructor() {
    this.initCatalog();
  }

  public static getInstance(): BuildingRegistry {
    if (!BuildingRegistry.instance) {
      BuildingRegistry.instance = new BuildingRegistry();
    }
    return BuildingRegistry.instance;
  }

  private initCatalog(): void {
    // --- 1. Transport ---
    this.register({
      id: 'road',
      name: 'Asphalt Road',
      category: 'transport',
      cost: 20,
      footprint: { width: 1, depth: 1 },
      maintenanceCost: 1,
      capacity: 0,
      description: 'Paved street connecting homes and businesses.',
      icon: '🛣️',
      unlockedByDefault: true,
    });

    this.register({
      id: 'streetlight',
      name: 'Streetlight',
      category: 'transport',
      cost: 30,
      footprint: { width: 1, depth: 1 },
      maintenanceCost: 1,
      capacity: 0,
      description: 'Vintage lamppost providing cozy illumination at night.',
      icon: '🏮',
      unlockedByDefault: true,
    });

    // --- 2. Residential ---
    this.register({
      id: 'small_house',
      name: 'Cozy House',
      category: 'residential',
      cost: 150,
      footprint: { width: 1, depth: 1 },
      maintenanceCost: 2,
      capacity: 4,
      description: 'Charming single-family home with warm roof tiles.',
      icon: '🏠',
      unlockedByDefault: true,
    });

    this.register({
      id: 'family_house',
      name: 'Family House',
      category: 'residential',
      cost: 250,
      footprint: { width: 1, depth: 1 },
      maintenanceCost: 3,
      capacity: 6,
      description: 'Two-story suburban home with porch and dormer window.',
      icon: '🏡',
      unlockedByDefault: true,
    });

    this.register({
      id: 'apartment',
      name: 'Apartments',
      category: 'residential',
      cost: 600,
      footprint: { width: 2, depth: 2 },
      maintenanceCost: 8,
      capacity: 16,
      description: 'Multi-unit 3-story brick apartment building with balconies.',
      icon: '🏢',
      unlockedByDefault: true,
    });

    // --- 3. Commercial ---
    this.register({
      id: 'shop',
      name: 'Corner Shop',
      category: 'commercial',
      cost: 300,
      footprint: { width: 1, depth: 1 },
      maintenanceCost: 5,
      capacity: 6,
      description: 'Local neighborhood market and storefront.',
      icon: '🏪',
      unlockedByDefault: true,
    });

    this.register({
      id: 'bakery',
      name: 'Bakery',
      category: 'commercial',
      cost: 350,
      footprint: { width: 1, depth: 1 },
      maintenanceCost: 6,
      capacity: 8,
      description: 'Artisan bakery with brick oven chimney and pastry counter.',
      icon: '🥐',
      unlockedByDefault: true,
    });

    this.register({
      id: 'restaurant',
      name: 'Bistro Restaurant',
      category: 'commercial',
      cost: 550,
      footprint: { width: 2, depth: 2 },
      maintenanceCost: 10,
      capacity: 14,
      description: 'Cozy bistro with outdoor dining terrace and umbrellas.',
      icon: '🍽️',
      unlockedByDefault: true,
    });

    // --- 4. Municipal ---
    this.register({
      id: 'school',
      name: 'Schoolhouse',
      category: 'municipal',
      cost: 800,
      footprint: { width: 2, depth: 2 },
      maintenanceCost: 15,
      capacity: 20,
      description: 'Classic red brick schoolhouse with bell tower cupola and clock.',
      icon: '🏫',
      unlockedByDefault: true,
    });

    this.register({
      id: 'clinic',
      name: 'Medical Clinic',
      category: 'municipal',
      cost: 750,
      footprint: { width: 2, depth: 2 },
      maintenanceCost: 14,
      capacity: 15,
      description: 'Modern neighborhood healthcare clinic with ambulance canopy.',
      icon: '🏥',
      unlockedByDefault: true,
    });

    // --- 5. Nature ---
    this.register({
      id: 'park',
      name: 'Neighborhood Park',
      category: 'nature',
      cost: 250,
      footprint: { width: 2, depth: 2 },
      maintenanceCost: 4,
      capacity: 0,
      description: '2×2 lush green park with walking paths, bench, and oak tree.',
      icon: '🌳',
      unlockedByDefault: true,
    });

    this.register({
      id: 'tree',
      name: 'Shade Tree',
      category: 'nature',
      cost: 50,
      footprint: { width: 1, depth: 1 },
      maintenanceCost: 1,
      capacity: 0,
      description: 'Decorative standalone foliage adding greenery to streets.',
      icon: '🌲',
      unlockedByDefault: true,
    });
  }

  public register(def: BuildingDefinition): void {
    this.catalog.set(def.id, def);
  }

  public get(id: string): BuildingDefinition | undefined {
    return this.catalog.get(id);
  }

  public getAll(): BuildingDefinition[] {
    return Array.from(this.catalog.values());
  }

  public getByCategory(category: BuildingCategory): BuildingDefinition[] {
    return this.getAll().filter((def) => def.category === category);
  }
}
