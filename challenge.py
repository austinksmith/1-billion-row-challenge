import os
import json
from multiprocessing import Pool, cpu_count

class Station:
    def __init__(self):
        self.min = float('inf')
        self.sum = 0
        self.max = float('-inf')
        self.count = 0

    def add_temperature(self, temp):
        if temp < self.min:
            self.min = temp
        if temp > self.max:
            self.max = temp
        self.sum += temp
        self.count += 1

    def average_temperature(self):
        if self.count == 0:
            return 0
        return self.sum / self.count

def process_chunk(chunk):
    stations = {}
    for line in chunk:
        if line.strip() == '':
            continue
        
        try:
            station, temperature = line.split(';')
            temperature = float(temperature)
        except ValueError:
            continue
        
        if station not in stations:
            stations[station] = Station()
        stations[station].add_temperature(temperature)
    
    encoded_lines = []
    for station, station_obj in stations.items():
        data_string = json.dumps({'station': station, 'temperature': station_obj.sum / station_obj.count}) + '\n'
        encoded_lines.append(data_string.encode('utf-8'))
    
    return encoded_lines

def process_output(encoded_chunks):
    stations = {}
    for encoded_lines in encoded_chunks:
        for encoded_line in encoded_lines:
            json_string = encoded_line.decode('utf-8')
            try:
                data = json.loads(json_string)
                station, temperature = data['station'], data['temperature']
            except json.JSONDecodeError:
                continue
            
            if station not in stations:
                stations[station] = Station()
            stations[station].add_temperature(temperature)
    
    return stations

def process_data(filename, chunk_size=4*1024*1024):
    pool = Pool(cpu_count())
    file_size = os.path.getsize(filename)
    total_chunks = (file_size + chunk_size - 1) // chunk_size
    progress_bar_length = 50
    
    def progress_bar(progress):
        percentage = min(100, round(progress * 100))
        progress_length = min(progress_bar_length, round(progress_bar_length * progress))
        bar = '=' * progress_length + '-' * (progress_bar_length - progress_length)
        print(f'\r[{bar}] {percentage}%', end='')

    with open(filename, 'r') as file:
        encoded_chunks = []
        partial_line = ''
        
        for chunk_index in range(total_chunks):
            chunk = file.read(chunk_size)
            if not chunk:
                break
            
            lines = (partial_line + chunk).split('\n')
            partial_line = lines.pop()  # Save the incomplete line fragment
            
            encoded_chunks.append(pool.apply_async(process_chunk, (lines,)))
            
            progress_bar((chunk_index + 1) / total_chunks)
        
        if partial_line:
            encoded_chunks.append(pool.apply_async(process_chunk, ([partial_line],)))
        
        pool.close()
        pool.join()
        
        encoded_chunks = [result.get() for result in encoded_chunks]
    
    stations = process_output(encoded_chunks)
    return stations

def print_data(stations):
    sorted_stations = sorted(stations.keys())
    result = '{'
    
    for index, station in enumerate(sorted_stations):
        stats = stations[station]
        avg_temp = stats.average_temperature()
        result += f'{station}={stats.min:.1f}/{avg_temp:.1f}/{stats.max:.1f}'
        if index < len(sorted_stations) - 1:
            result += ','
    
    result += '}'
    print(result)

if __name__ == '__main__':
    import time
    start_time = time.time()
    
    stations = process_data('measurements.txt')
    
    print(f'\nProcessing completed in {time.time() - start_time:.2f} seconds.')
    print_data(stations)
