class CreateEntries < ActiveRecord::Migration[8.0]
  def change
    create_table :entries do |t|
      t.string :headword
      t.string :part_of_speech
      t.jsonb :variant_forms
      t.text :etymology
      t.jsonb :definitions_spanish
      t.jsonb :definitions_english
      t.jsonb :examples
      t.jsonb :synonyms
      t.jsonb :cross_references
      t.text :grammatical_notes
      t.string :scientific_name
      t.integer :page_number

      t.timestamps
    end

    add_index :entries, :headword
    add_index :entries, :page_number
  end
end
