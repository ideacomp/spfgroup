import re
with open('/home/radunan/spfgroup-kopie/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Change POPTÁVKA
html = html.replace('>POPTÁVKA<', '>Kontaktovat<')

# 2. Remove hero logo
html = html.replace('<img src="logo.png" alt="SPF Group" class="hero-main-logo" />\n', '')
html = html.replace('<img src="logo.png" alt="SPF Group" class="hero-main-logo" />', '')

# 3. Reorder Nav
nav_old = """                <a href="#reference" class="nav-link">Reference</a>
                <a href="#tym" class="nav-link">Tým</a>
                <a href="#blog" class="nav-link">Blog</a>"""
nav_new = """                <a href="#reference" class="nav-link">Reference</a>
                <a href="#blog" class="nav-link">Blog</a>
                <a href="#tym" class="nav-link">Tým</a>"""
html = html.replace(nav_old, nav_new)

footer_nav_old = """                    <a href="#reference">Reference</a>
                    <a href="#tym">Tým</a>
                    <a href="#blog">Blog</a>"""
footer_nav_new = """                    <a href="#reference">Reference</a>
                    <a href="#blog">Blog</a>
                    <a href="#tym">Tým</a>"""
html = html.replace(footer_nav_old, footer_nav_new)

# 4. Remove contact icons
# We find blocks like:
# <div class="k-icon" aria-hidden="true"><i class="fa-solid fa-location-dot" aria-hidden="true"></i></div>
html = re.sub(r'<div class="k-icon"[^>]*><i class="fa-solid [^"]+"[^>]*></i></div>\s*', '', html)

# 5. Extract sections
tym_pattern = re.compile(r'(    <!-- TÝM -->\s*<section id="tym".*?(?=    <!-- BLOG -->))', re.DOTALL)
blog_pattern = re.compile(r'(    <!-- BLOG -->\s*<section id="blog".*?(?=    <!-- REFERENCE & PARTNEŘI -->))', re.DOTALL)
ref_pattern = re.compile(r'(    <!-- REFERENCE & PARTNEŘI -->\s*<section id="reference".*?(?=    <!-- KONTAKT -->))', re.DOTALL)

tym_match = tym_pattern.search(html)
blog_match = blog_pattern.search(html)
ref_match = ref_pattern.search(html)

if tym_match and blog_match and ref_match:
    tym_content = tym_match.group(1)
    blog_content = blog_match.group(1)
    ref_content = ref_match.group(1)
    
    # We want order: REFERENCE -> BLOG -> TÝM
    # In original it is TÝM -> BLOG -> REFERENCE
    # We replace from start of TÝM to end of REFERENCE
    full_content = tym_content + blog_content + ref_content
    new_full_content = ref_content + blog_content + tym_content
    
    html = html.replace(full_content, new_full_content)
else:
    print("Could not find all sections!")

# 6. Add Photos to Reference
# We will insert a project photos gallery in the reference section.
# We look for:
#                 <p class="body-text text-center">Mezi naše významné klienty patří například:<br />
#                     <strong>Olomouc, Mladá Boleslav, Cheb, Mělník, Milovice, Sušice, Jesenice, Čerčany, Brodce</strong>
#                     a další.
#                 </p>
# And add a new block right below it.
photos_html = """
                <div class="project-gallery" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 40px 0;">
                    <img src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=600&h=400" alt="Projekt 1" style="border-radius: var(--radius-md); width: 100%; height: 200px; object-fit: cover; box-shadow: var(--shadow-sm);" />
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600&h=400" alt="Projekt 2" style="border-radius: var(--radius-md); width: 100%; height: 200px; object-fit: cover; box-shadow: var(--shadow-sm);" />
                    <img src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=600&h=400" alt="Projekt 3" style="border-radius: var(--radius-md); width: 100%; height: 200px; object-fit: cover; box-shadow: var(--shadow-sm);" />
                    <img src="https://images.unsplash.com/photo-1473161928969-eec6545163a3?auto=format&fit=crop&q=80&w=600&h=400" alt="Projekt 4" style="border-radius: var(--radius-md); width: 100%; height: 200px; object-fit: cover; box-shadow: var(--shadow-sm);" />
                </div>
"""
html = html.replace('a další.\n                </p>\n', 'a další.\n                </p>\n' + photos_html)

with open('/home/radunan/spfgroup-kopie/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html")
