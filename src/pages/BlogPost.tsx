import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, User, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEOHead } from '@/components/seo/SEOHead';
import { Footer } from '@/components/layout/Footer';
import { blogPosts } from '@/data/blogPosts';
import ReactMarkdown from 'react-markdown';
import mmcLogo from '@/assets/mmc-logo.png';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  const shareUrl = `https://mmcai.app/blog/${post.slug}`;
  const shareText = post.title;

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${post.title} | MMCai Blog`}
        description={post.description}
        keywords={post.keyword}
        canonical={`/blog/${post.slug}`}
        ogType="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.description,
          author: { '@type': 'Organization', name: 'MMCai' },
          datePublished: post.date,
          publisher: { '@type': 'Organization', name: 'MMCai', logo: { '@type': 'ImageObject', url: 'https://mmcai.app/og-image.png' } },
        }}
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

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-[720px] mx-auto">
          {/* Back link */}
          <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-4 w-4" />{post.author}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{post.readingTime}</span>
              <span>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </header>

          {/* Table of Contents */}
          <Card className="p-4 mb-8 bg-muted/30">
            <p className="text-sm font-semibold mb-2">Table of Contents</p>
            <ol className="space-y-1">
              {post.toc.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground">{i + 1}. {item}</li>
              ))}
            </ol>
          </Card>

          {/* Content */}
          <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </article>

          {/* Share */}
          <div className="flex items-center gap-3 mt-10 pt-6 border-t border-border/40">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Share:</span>
            <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Twitter</a>
            <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">WhatsApp</a>
            <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">LinkedIn</a>
          </div>

          {/* CTA */}
          <Card className="p-6 mt-10 text-center bg-emerald-600/10 border-emerald-600/30">
            <h3 className="text-xl font-bold mb-2">Ready to level up your trading?</h3>
            <p className="text-muted-foreground mb-4">Join 500+ Indian traders using MMCai to journal, backtest, and grow.</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link to="/signup">Try MMCai Free →</Link>
            </Button>
          </Card>

          {/* Related Posts */}
          {related.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold mb-4">Related Posts</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link key={r.slug} to={`/blog/${r.slug}`}>
                    <Card className="p-4 h-full hover:border-primary/40 transition-colors">
                      <p className="text-sm font-medium mb-1 line-clamp-2">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.readingTime}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
