type PageHeaderProps = { title: string; description: string };
export function PageHeader({ title, description }: PageHeaderProps) { return <header className="space-y-2"><h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="text-slate-600">{description}</p></header>; }
