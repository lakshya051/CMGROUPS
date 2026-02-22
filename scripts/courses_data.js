// Mock Course Data

const courses = [
    {
        id: 'c1',
        title: 'Master PC Building: From Component Selection to Boot',
        instructor: 'Alex Chen',
        price: 4999,
        duration: '12 Hours',
        level: 'Beginner',
        image: '🖥️',
        description: 'Learn how to build your own custom PC from scratch. We cover compatibility, assembly, cable management, and BIOS configuration.',
        syllabus: [
            'Introduction to PC Components',
            'Selecting the Right Parts',
            'Motherboard & CPU Installation',
            'RAM & Storage',
            'Power Supply & Cable Management',
            'First Boot & BIOS Setup'
        ]
    },
    {
        id: 'c2',
        title: 'Python for Automation & Data Science',
        instructor: 'Sarah Jenkins',
        price: 3499,
        duration: '20 Hours',
        level: 'Intermediate',
        image: '🐍',
        description: 'Automate boring tasks and analyze data with Python. Perfect for hardware enthusiasts wanting to learn scripting.',
        syllabus: [
            'Python Basics & Syntax',
            'File Handling & Automation',
            'Web Scraping',
            'Data Analysis with Pandas',
            'Building a Dashboard'
        ]
    },
    {
        id: 'c3',
        title: 'Network Fundamentals & Home Lab Setup',
        instructor: 'David Kim',
        price: 2999,
        duration: '8 Hours',
        level: 'Beginner',
        image: '🌐',
        description: 'Understand how the internet works and set up your own secure home network and media server.',
        syllabus: [
            'IP Addressing & Subnets',
            'Routers & Switches',
            'Setting up a NAS',
            'VPNs & Security',
            'Home Assistant Basics'
        ]
    },
    {
        id: 'c4',
        title: 'Advanced Overclocking & Cooling',
        instructor: 'Der8auer (Guest)',
        price: 5999,
        duration: '10 Hours',
        level: 'Advanced',
        image: '❄️',
        description: 'Push your hardware to the limit safely. Learn about voltage control, custom loops, and benchmarks.',
        syllabus: [
            'Thermodynamics Basics',
            'CPU Overclocking',
            'GPU Under/Overclocking',
            'Custom Water Cooling Loops',
            'Benchmarking & Stability Testing'
        ]
    }
];

export function getCourses() {
    return courses;
}

export function getCourseById(id) {
    return courses.find(c => c.id === id);
}
