import { createElement } from 'react';
import { weatherIcon, type WeatherHour } from '../lib/weather';

interface WeatherGlyphProps {
    hour: Pick<WeatherHour, 'condition' | 'isDay'>;
    color: string;
    size: number;
}

/** The icon for an hour's weather. The icon is chosen from data, so it's created as an element rather than named in JSX. */
export function WeatherGlyph({ hour, color, size }: WeatherGlyphProps) {
    return createElement(weatherIcon(hour), { color, size });
}
