from PIL import Image, ImageDraw, ImageFont
H=Image.open('/home/user/images/aruquest/store/header.png').convert('RGB')
FONT='/home/user/images/aruquest-preview/assets/node_modules/@expo-google-fonts/dotgothic16/400Regular/DotGothic16_400Regular.6c52c4b44f10786745afda7bbfff0d85.ttf'
chest=Image.open('/home/user/app-aruquest/assets/dot/chest_big@3x.png')
strip=H.crop((0,720,3840,1646))
SKY1=(148,188,192); SKY2=(169,201,195); INK=(28,34,51); CREAM=(250,244,224); GOLD=(255,214,102)
def text(d,xy,s,size,fill,anchor='mm',stroke=8):
    f=ImageFont.truetype(FONT,size)
    d.text(xy,s,font=f,fill=fill,anchor=anchor,stroke_width=stroke,stroke_fill=INK)
def sky(img,h):
    d=ImageDraw.Draw(img); d.rectangle((0,0,img.width,h),fill=SKY1); d.rectangle((0,int(h*0.62),img.width,h),fill=SKY2)
def paste_chest(img,cx,cy,scale):
    c=chest.resize((chest.width*scale//3, chest.height*scale//3),Image.NEAREST)
    img.paste(c,(cx-c.width//2,cy-c.height//2),c)
def card():
    W,Hh=1920,1080; img=Image.new('RGB',(W,Hh)); s=strip.resize((1920,463),Image.NEAREST)
    sky(img,Hh-463); img.paste(s,(0,Hh-463)); d=ImageDraw.Draw(img)
    text(d,(760,250),'7日 歩きつづけて',118,CREAM)
    text(d,(760,420),'宝箱を ひらこう',118,GOLD)
    paste_chest(img,1560,350,4)
    img.save('event-card-1920x1080.png')
def detail(lang):
    W,Hh=1080,1920; img=Image.new('RGB',(W,Hh)); s=strip.crop((960,0,2880,926)).resize((1080,521),Image.NEAREST)
    sky(img,Hh-521); img.paste(s,(0,Hh-521)); d=ImageDraw.Draw(img)
    if lang=='ja':
        lines=[('1日 3,000歩を',96,CREAM),('7日 つづけると',96,CREAM),('R以上の 宝箱',110,GOLD)]
        sub='戦いは 完全オート'
    else:
        lines=[('3,000 steps a day',88,CREAM),('for 7 days in a row',88,CREAM),('= an R+ chest',100,GOLD)]
        sub='Battles are fully auto'
    y=250
    for s_,sz,c in lines: text(d,(540,y),s_,sz,c); y+=sz+60
    paste_chest(img,540,y+220,4)
    text(d,(540,y+500),sub,64,CREAM,stroke=6)
    img.save(f'event-detail-{lang}-1080x1920.png')
card(); detail('ja'); detail('en')
