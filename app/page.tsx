import { SyntheticSeismogram } from "@/components/synthetic-seismogram"

export default function Page() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">合成地震记录生成器</h1>
          <p className="mt-2 text-muted-foreground">基于褶积模型的合成地震记录生成与验证</p>
        </header>
        <SyntheticSeismogram />
      </div>
    </main>
  )
}
