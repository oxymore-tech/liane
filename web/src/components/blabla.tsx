interface BlablaProps {
    text: string;
    content?: boolean;
}

export function Blabla({text, content}: BlablaProps) {
    return <div className="bg-green-400 rounded m-2 p-2 border border-green-800 shadow-lg">{text}</div>;
}