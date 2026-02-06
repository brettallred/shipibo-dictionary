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

    # Filter out section B entries that leak in from the last page of section A.
    # Sub-entries (compounds like "báhuaatsa" under "átsa") are legitimate and kept.
    # Only reject entries whose headword (after stripping accents/dashes) starts with "b".
    entries = entries.reject do |data|
      hw = (data["headword"] || "").unicode_normalize(:nfkd).gsub(/[\u0300-\u036f]/, "").downcase.sub(/\A-+/, "")
      hw.start_with?("b") && !hw.match?(/atsa|atapa|awa/)
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
