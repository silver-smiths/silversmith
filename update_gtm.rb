require 'fileutils'

gtm_head = <<~GTM_HEAD
  <!-- Google Tag Manager -->
  <script>(function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({
        'gtm.start':
          new Date().getTime(), event: 'gtm.js'
      }); var f = d.getElementsByTagName(s)[0],
        j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
          'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', 'GTM-MQT4J6J');
  </script>
  <!-- End Google Tag Manager -->
GTM_HEAD

gtm_body = <<~GTM_BODY
  <!-- Google Tag Manager (noscript) -->
  <noscript>
    <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MQT4J6J" height="0" width="0"
      style="display:none;visibility:hidden"></iframe>
  </noscript>
  <!-- End Google Tag Manager (noscript) -->
GTM_BODY

Dir.glob("**/*.html").each do |f|
  content = File.read(f)
  
  # Remove old one-line GTM script completely
  content = content.gsub(/<script>\(function\s*\(w,\s*d,\s*s,\s*l,\s*i\).*?<\/script>\n?/m, '')
  # Remove new multi-line GTM script completely if present
  content = content.gsub(/[ \t]*<!-- Google Tag Manager -->.*?<!-- End Google Tag Manager -->\n?/m, '')
  
  # Remove old noscript completely
  content = content.gsub(/[ \t]*<noscript><iframe.*?id=GTM-MQT4J6J.*?<\/noscript>\n?/m, '')
  content = content.gsub(/[ \t]*<!-- Google Tag Manager \(noscript\) -->.*?<!-- End Google Tag Manager \(noscript\) -->\n?/m, '')
  
  # Insert head GTM before <link rel="preconnect" href="https://fonts.googleapis.com" /> if exists, or before </head>
  if content.include?('<link rel="preconnect" href="https://fonts.googleapis.com"')
    content.sub!(/([ \t]*)(<link rel="preconnect" href="https:\/\/fonts.googleapis.com")/, "\\1#{gtm_head.gsub("\n", "\n\\1")}\n\\1\\2")
  else
    content.sub!(/<\/head>/, "  #{gtm_head}\n</head>")
  end
  
  # Insert body GTM right after body opening tag
  content.sub!(/(<body[^>]*>)/, "\\1\n#{gtm_body}")
  
  File.write(f, content)
end
puts "Updated GTM successfully."
