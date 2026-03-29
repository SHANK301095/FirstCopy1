import { Link } from 'react-router-dom';
import { ArrowRight, Clock, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { Footer } from '@/components/layout/Footer';
import { blogPosts } from '@/data/blogPosts';
import mmcLogo from '@/assets/mmc-logo.png';

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Trading Blog — Tips, Guides & Strategies | MMCai"
        description="Expert trading guides, backtesting tutorials, prop firm tips, and trading psychology insights for Indian traders."
        keywords="trading blog India, backtesting guide, MT5 journal, prop firm tips, trading psychology"
        canonical="/blog"
      />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={mmcLogo} alt="MMCai" className="h-7 w-7 object-contain" />
            <span className="text-lg font-bold text-primary">MMCai</span>
          </Link>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
            <Link to="/signup">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Trading Blog</h1>
          <p className="text-muted-foreground text-lg mb-10">Expert guides & insights for Indian traders</p>

          <div className="space-y-6">
            {blogPosts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`}>
                <Card className="p-6 hover:border-primary/40 transition-colors group">
                  <Badge variant="secondary" className="mb-3 text-xs">{post.keyword}</Badge>
                  <h2 className="text-xl md:text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground mb-4 line-clamp-2">{post.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readingTime}</span>
                    <span>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
