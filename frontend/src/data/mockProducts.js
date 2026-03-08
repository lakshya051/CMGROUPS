export const products = [
    {
        id: 'p1',
        title: 'NVIDIA GeForce RTX 4090 Founder Edition',
        price: 185000,
        category: 'GPU',
        brand: 'NVIDIA',
        rating: 4.9,
        reviews: 128,
        stock: 5,
        image: 'https://assets.nvidia.partners/images/png/RTX-4090-FE-3QTR-Back-Left.png',
        specs: {
            'VRAM': '24GB GDDR6X',
            'Boost Clock': '2.52 GHz',
            'Architecture': 'Ada Lovelace'
        },
        description: 'The ultimate GeForce GPU. It brings an enormous leap in performance, efficiency, and AI-powered graphics.'
    },
    {
        id: 'p2',
        title: 'Intel Core i9-14900K',
        price: 55999,
        category: 'CPU',
        brand: 'Intel',
        rating: 4.8,
        reviews: 85,
        stock: 12,
        image: 'https://m.media-amazon.com/images/I/61uJg5-yTLL._AC_UF1000,1000_QL80_.jpg', // Placeholder
        specs: {
            'Cores': '24 (8P + 16E)',
            'Threads': '32',
            'Max Turbo': '6.0 GHz'
        },
        description: 'Game without compromise. 24 cores and 32 threads ensure the ultimate gaming and multitasking experience.'
    },
    {
        id: 'p3',
        title: 'AMD Ryzen 9 7950X3D',
        price: 61999,
        category: 'CPU',
        brand: 'AMD',
        rating: 4.9,
        reviews: 92,
        stock: 8,
        image: 'https://m.media-amazon.com/images/I/51f2hk8joaL._AC_UF1000,1000_QL80_.jpg', // Placeholder
        specs: {
            'Cores': '16',
            'Threads': '32',
            'Cache': '128MB L3'
        },
        description: 'The dominant gaming processor with AMD 3D V-Cache technology for massive gaming performance.'
    },
    {
        id: 'p4',
        title: 'ASUS ROG Maximus Z790 Hero',
        price: 64000,
        category: 'Motherboard',
        brand: 'ASUS',
        rating: 4.7,
        reviews: 45,
        stock: 4,
        image: 'https://dlcdnwebimgs.asus.com/gain/BC7D87CA-7C12-4217-9154-159670002A54/w1000/h732',
        specs: {
            'Socket': 'LGA 1700',
            'Form Factor': 'ATX',
            'Memory': 'DDR5'
        },
        description: 'Loaded with high-octane components and cutting-edge features for enthusiasts.'
    },
    {
        id: 'p5',
        title: 'Corsair Dominator Platinum RGB 32GB',
        price: 18999,
        category: 'RAM',
        brand: 'Corsair',
        rating: 4.8,
        reviews: 210,
        stock: 25,
        image: 'https://m.media-amazon.com/images/I/61d1FG+p1LL.jpg',
        specs: {
            'Capacity': '32GB (2x16GB)',
            'Speed': '6000MHz',
            'Type': 'DDR5'
        },
        description: 'Push the limits of performance with CORSAIR DOMINATOR PLATINUM RGB DDR5 Memory.'
    },
    {
        id: 'p6',
        title: 'Samsung 990 PRO 2TB NVMe',
        price: 16999,
        category: 'Storage',
        brand: 'Samsung',
        rating: 4.9,
        reviews: 350,
        stock: 100,
        image: 'https://semiconductor.samsung.com/resources/images/consumer-storage/internal-ssd/990-pro/mz-v9p2t0bw_001_front_black_1.jpg',
        specs: {
            'Capacity': '2TB',
            'Read Speed': '7450 MB/s',
            'Write Speed': '6900 MB/s'
        },
        description: 'Reach max performance of PCIe 4.0. Experience longer-lasting, opponent-blasting speed.'
    }
];
