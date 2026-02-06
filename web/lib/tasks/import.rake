namespace :dictionary do
  desc "Import entries from JSON file"
  task import: :environment do
    json_path = Rails.root.join("..", "data", "entries_section_a_translated.json")

    unless File.exist?(json_path)
      puts "Error: #{json_path} not found"
      exit 1
    end

    entries = JSON.parse(File.read(json_path))
    puts "Loaded #{entries.count} entries from JSON"

    # Filter out section B entries that leak in from shared pages.
    # Keep sub-entries (compounds like "báhuaatsa" under "átsa") — they're
    # legitimate A-section content. Only drop entries whose headword starts
    # with a non-A letter AND aren't compound words containing an A-section root.
    section_b_started = false
    entries = entries.reject do |data|
      hw = (data["headword"] || "").unicode_normalize(:nfkd).gsub(/[\u0300-\u036f]/, "").downcase.sub(/\A-+/, "")
      starts_with_a = hw.start_with?("a")

      if !starts_with_a && !section_b_started
        # Check if this looks like a section B entry (simple headword, not a compound)
        # vs a legitimate sub-entry (compound containing an A-section root like "atsa", "atapa")
        is_compound = hw.match?(/atsa|atapa|awa|ani/)
        section_b_started = !is_compound
      end

      section_b_started && !starts_with_a
    end

    puts "Importing #{entries.count} entries (after filtering section boundary)..."

    Entry.transaction do
      entries.each do |data|
        Entry.create!(
          headword: data["headword"]&.tr("áéíóúÁÉÍÓÚ", "aeiouAEIOU"),
          part_of_speech: data["part_of_speech"],
          variant_forms: data["variant_forms"] || [],
          etymology: data["etymology"],
          definitions_spanish: data["definitions_spanish"] || [],
          definitions_english: data["definitions_english"] || [],
          examples: data["examples"] || [],
          synonyms: data["synonyms"] || [],
          cross_references: data["cross_references"] || [],
          grammatical_notes: data["grammatical_notes"],
          scientific_name: data["scientific_name"],
          page_number: data["page_number"]
        )
        print "."
      end
    end

    puts "\nDone! Imported #{Entry.count} entries."
  end

  desc "Clear all entries"
  task clear: :environment do
    Entry.delete_all
    puts "Cleared all entries."
  end
end
