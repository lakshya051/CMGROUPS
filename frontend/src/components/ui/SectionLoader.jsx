import React from 'react';

const SectionLoader = ({ message = "Loading data..." }) => (
    <div className="flex flex-col items-center justify-center p-12 w-full">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-text-muted text-sm font-medium animate-pulse">{message}</p>
    </div>
);

export default SectionLoader;
