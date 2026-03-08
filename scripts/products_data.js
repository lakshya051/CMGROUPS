// Product Data (Mock)

export const products = [
    {
        id: "p1",
        title: "NVIDIA GeForce RTX 4090",
        price: 185000,
        category: "Components",
        brand: "NVIDIA",
        image: "🎮", // Placeholder icon
        description: "The ultimate GeForce GPU. It brings an enormous leap in performance, efficiency, and AI-powered graphics.",
        specs: {
            "VRAM": "24GB GDDR6X",
            "Cores": "16384 CUDA",
            "Boost Clock": "2.52 GHz"
        },
        stock: 5,
        rating: 4.9
    },
    {
        id: "p2",
        title: "AMD Ryzen 9 7950X",
        price: 65000,
        category: "Components",
        brand: "AMD",
        image: "💻",
        description: "16-core, 32-thread unlocked desktop processor. The dominant gaming processor, with AMD 3D V-Cache technology.",
        specs: {
            "Cores": "16",
            "Threads": "32",
            "Max Boost": "5.7 GHz"
        },
        stock: 12,
        rating: 4.8
    },
    {
        id: "p3",
        title: "Alienware 34 Curved QD-OLED",
        price: 110000,
        category: "Peripherals",
        brand: "Dell",
        image: "🖥️",
        description: "The world's first Quantum Dot OLED gaming monitor. Features infinite contrast ratio and 175Hz refresh rate.",
        specs: {
            "Resolution": "3440 x 1440",
            "Refresh Rate": "175Hz",
            "Panel": "QD-OLED"
        },
        stock: 3,
        rating: 4.7
    },
    {
        id: "p4",
        title: "Logitech G Pro X Superlight",
        price: 14000,
        category: "Accessories",
        brand: "Logitech",
        image: "🖱️",
        description: "Meticulously designed in collaboration with many of the world's leading esports pros.",
        specs: {
            "Weight": "63g",
            "Sensor": "HERO 25K",
            "Battery": "70 Hours"
        },
        stock: 25,
        rating: 4.6
    },
    {
        id: "p5",
        title: "Corsair Dominator Platinum 32GB",
        price: 18000,
        category: "Components",
        brand: "Corsair",
        image: "💾",
        description: "DDR5 Memory pushed to its limits. Tightly screened high-frequency memory chips.",
        specs: {
            "Capacity": "32GB (2x16GB)",
            "Speed": "6000MHz",
            "Latency": "CL36"
        },
        stock: 8,
        rating: 4.9
    },
    {
        id: "p6",
        title: "ASUS ROG Maximus Z790 Hero",
        price: 68000,
        category: "Components",
        brand: "ASUS",
        image: "🔌",
        description: "High-performance motherboard with robust power delivery and comprehensive cooling.",
        specs: {
            "Socket": "LGA1700",
            "Chipset": "Z790",
            "WiFi": "6E"
        },
        stock: 4,
        rating: 4.8
    }
];

export function getProducts() {
    return products;
}

export function getProductById(id) {
    return products.find(p => p.id === id);
}
